import google.generativeai as genai
from app.core.config import settings
import asyncio
import time
from concurrent.futures import ThreadPoolExecutor
from google import genai as genai_new
from google.genai import types

# Configure Gemini (legacy SDK for embeddings)
genai.configure(api_key=settings.GEMINI_API_KEY)

# Thread pool for blocking Gemini calls
executor = ThreadPoolExecutor(max_workers=5)


class GeminiService:
    def __init__(self):
        import google.generativeai as genai
        genai.configure(api_key=settings.GEMINI_API_KEY)
        self.model = genai.GenerativeModel("gemini-2.5-flash")
        self.model_name = "gemini-2.5-flash"
        self.embedding_model = "models/gemini-embedding-001"

        # New SDK: Chat, OCR, Test, Flashcard for Gemma-4
        self.genai_client = genai_new.Client(api_key=settings.GEMINI_API_KEY)
        self.gemma_model = "gemma-4-31b-it"
        self.gemma_max_retries = 3

    # =====================================================================
    # GEMMA-4 RETRY HELPER
    # =====================================================================
    async def _gemma_call_with_retry(self, generate_fn, timeout: float = 120.0) -> str:
        """
        Execute a Gemma-4 API call with exponential backoff retry.
        Google's Gemma API can return transient 500 INTERNAL errors,
        retrying after a short delay usually succeeds.
        """
        loop = asyncio.get_event_loop()
        last_error = None

        for attempt in range(self.gemma_max_retries):
            try:
                result = await asyncio.wait_for(
                    loop.run_in_executor(executor, generate_fn),
                    timeout=timeout
                )
                return result if result else ""
            except asyncio.TimeoutError:
                last_error = TimeoutError(f"Gemma timeout after {timeout}s")
                print(f"[Gemma] Timeout (attempt {attempt+1}/{self.gemma_max_retries})")
            except Exception as e:
                last_error = e
                error_str = str(e)
                # Only retry on 500/503 server errors
                if '500' in error_str or '503' in error_str or 'INTERNAL' in error_str:
                    print(f"[Gemma] Server error (attempt {attempt+1}/{self.gemma_max_retries}): {error_str[:100]}")
                else:
                    # Non-retryable error (400, 404, etc.) - fail immediately
                    raise

            if attempt < self.gemma_max_retries - 1:
                wait_time = 2 ** (attempt + 1)  # 2s, 4s
                print(f"[Gemma] Retrying in {wait_time}s...")
                await asyncio.sleep(wait_time)

        raise last_error or Exception("Gemma API call failed after all retries")

    # =====================================================================
    # EMBEDDING (Legacy SDK - unchanged)
    # =====================================================================
    async def generate_embedding(self, text: str, *, task: str = "retrieval_document", retry_count: int = 3) -> list[float]:
        """Generate embedding with retry logic and timeout"""
        for attempt in range(retry_count):
            try:
                loop = asyncio.get_event_loop()

                def _embed():
                    task_type = "RETRIEVAL_DOCUMENT" if task == "retrieval_document" else "RETRIEVAL_QUERY"
                    result = genai.embed_content(
                        model=self.embedding_model,
                        content=text[:9000],
                        task_type=task_type
                    )
                    embedding = result['embedding']
                    if len(embedding) > 768:
                        embedding = embedding[:768]
                    return embedding

                result = await asyncio.wait_for(
                    loop.run_in_executor(executor, _embed),
                    timeout=30.0
                )
                return result
            except asyncio.TimeoutError:
                print(f"Embedding timeout (attempt {attempt+1}/{retry_count}): {text[:50]}...")
                if attempt < retry_count - 1:
                    await asyncio.sleep(2 ** attempt)
                    continue
                raise
            except Exception as e:
                print(f"Error generating embedding (attempt {attempt+1}/{retry_count}): {e}")
                if attempt < retry_count - 1:
                    await asyncio.sleep(2 ** attempt)
                    continue
                raise

    async def generate_query_embedding(self, text: str) -> list[float]:
        return await self.generate_embedding(text, task="retrieval_query")

    # =====================================================================
    # GEMMA-4 CHAT METHODS (New SDK)
    # =====================================================================
    async def generate_chat_answer(self, question: str, context: str) -> str:
        """Generate chat answer using Gemma-4 with retry."""
        prompt = f"""Sen yardımcı bir çalışma asistanısın. Aşağıdaki bağlamı OKUYACAK, ANLAYACAK, ve KENDI CÜMLELERINLE AÇIKLAYACAKSIN.

KURALLAR:
- Türkçe yanıt ver
- Markdown formatı kullan
- Açık ve anlaşılır ol
- Bağlamda bilgi yoksa, bunu belirt

Bağlam:
{context}

Kullanıcı Sorusu: {question}

Yanıt:"""

        def _generate():
            response = self.genai_client.models.generate_content(
                model=self.gemma_model,
                contents=[prompt]
            )
            return response.text

        result = await self._gemma_call_with_retry(_generate, timeout=120.0)
        return result if result else "Yanıt oluşturulamadı."

    async def generate_chat_answer_simple(self, prompt: str) -> str:
        """Direct prompt to Gemma-4 with retry."""
        def _generate():
            response = self.genai_client.models.generate_content(
                model=self.gemma_model,
                contents=[prompt]
            )
            return response.text

        result = await self._gemma_call_with_retry(_generate, timeout=120.0)
        return result if result else "Yanıt oluşturulamadı."

    async def generate_chat_answer_multi_doc(self, question: str, combined_context: str) -> str:
        """Gemma-4 with multi-document context."""
        prompt = f"""Kaynak Materyalleri:
{combined_context}

Kullanıcı Sorusu: {question}

Yanıt:"""
        return await self.generate_chat_answer_simple(prompt)

    # =====================================================================
    # STRUCTURED CONTENT (Test & Flashcard JSON generation)
    # =====================================================================
    async def generate_structured_content(self, system_prompt: str, user_prompt: str, max_tokens: int = 8192) -> str:
        """Generate structured JSON content using Gemma-4 with retry."""
        config = types.GenerateContentConfig(
            system_instruction=system_prompt,
            max_output_tokens=max_tokens
        )

        def _generate():
            response = self.genai_client.models.generate_content(
                model=self.gemma_model,
                contents=[user_prompt],
                config=config
            )
            return response.text

        result = await self._gemma_call_with_retry(_generate, timeout=180.0)
        return result if result else ""

    # =====================================================================
    # OCR (Page-by-page PNG via PyMuPDF)
    # =====================================================================
    async def ocr_pdf_file(self, pdf_bytes: bytes) -> str:
        """
        Use Gemma-4 multimodal vision to extract text from a PDF.
        Converts each page to high-res PNG and sends to Gemma-4.
        """
        import fitz  # PyMuPDF

        pdf_doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        all_text_parts = []

        for page_num in range(len(pdf_doc)):
            page = pdf_doc[page_num]
            mat = fitz.Matrix(200/72, 200/72)  # 200 DPI
            pix = page.get_pixmap(matrix=mat)
            page_img_bytes = pix.tobytes("png")

            def _make_ocr_fn(img_data):
                def _ocr_page():
                    response = self.genai_client.models.generate_content(
                        model=self.gemma_model,
                        contents=[
                            types.Part.from_bytes(data=img_data, mime_type="image/png"),
                            "Bu PDF sayfasındaki TÜM metni oku ve yaz. Metni olduğu gibi oku, yorum ekleme. Tablo varsa düzgün formatla. Başlıkları ve alt başlıkları koru. Liste varsa madde işaretlerini koru."
                        ]
                    )
                    return response.text
                return _ocr_page

            try:
                result = await self._gemma_call_with_retry(_make_ocr_fn(page_img_bytes), timeout=60.0)
                if result:
                    all_text_parts.append(result.strip())
            except Exception as e:
                print(f"[OCR] Page {page_num + 1} failed after retries: {e}")
                continue

        return "\n\n".join(all_text_parts)

    async def ocr_pdf_page(self, image_bytes: bytes) -> str:
        """
        Use Gemma-4 vision to extract text from a single page image with retry.
        """
        def _ocr():
            response = self.genai_client.models.generate_content(
                model=self.gemma_model,
                contents=[
                    types.Part.from_bytes(data=image_bytes, mime_type="image/png"),
                    "Bu bir PDF sayfasının görüntüsü. Lütfen bu sayfadaki TÜM metni aynen oku ve yaz. Tablo varsa düzgün formatla. Başlıkları ve alt başlıkları koru."
                ]
            )
            return response.text

        try:
            result = await self._gemma_call_with_retry(_ocr, timeout=60.0)
            return result.strip() if result else ""
        except Exception as e:
            print(f"[OCR] Single page failed after retries: {e}")
            return ""

    # =====================================================================
    # VISION TEXT EXTRACTION (Problematic text cleanup)
    # =====================================================================
    async def extract_text_with_vision(self, problematic_text: str) -> str:
        """
        Use Gemma-4 to clean/fix problematic text that failed embedding.
        """
        prompt = f"""Aşağıdaki metin bir PDF'den çıkarılmış ancak sorunlu olabilir.
Lütfen bu metinden anlamlı içeriği çıkar ve temiz bir şekilde yeniden yaz.
Eğer metin tamamen anlamsızsa, boş yanıt ver.
Yorum ekleme, sadece temizlenmiş metni ver.

Sorunlu metin:
{problematic_text[:8000]}

Temizlenmiş metin:"""

        return await self.generate_chat_answer_simple(prompt)

    # =====================================================================
    # LEGACY GEMINI 2.5 FLASH METHODS (kept for direct use if needed)
    # =====================================================================
    async def generate_answer_simple(self, prompt: str) -> str:
        """Legacy: Direct prompt to Gemini 2.5 Flash."""
        try:
            loop = asyncio.get_event_loop()

            def _generate():
                response = self.model.generate_content(prompt)
                return response.text

            result = await asyncio.wait_for(
                loop.run_in_executor(executor, _generate),
                timeout=60.0
            )
            return result
        except asyncio.TimeoutError:
            return "Yanıt oluşturulurken zaman aşımı oldu. Lütfen tekrar deneyin."
        except Exception as e:
            return f"Yanıt oluşturulurken hata: {e}"

    async def generate_answer(self, question: str, context: str) -> str:
        """Legacy: Gemini 2.5 Flash answer."""
        prompt = f"""Sen yardımcı bir çalışma asistanısın...

Bağlam:
{context}

Kullanıcı Sorusu: {question}

Yanıt:"""
        return await self.generate_answer_simple(prompt)


gemini_service = GeminiService()
