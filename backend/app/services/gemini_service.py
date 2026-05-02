from google import genai
from google.genai import types
from app.core.config import settings
import asyncio
from concurrent.futures import ThreadPoolExecutor

# Configure Gemini with new SDK
client = genai.Client(api_key=settings.GEMINI_API_KEY)

# Thread pool for blocking Gemini calls
executor = ThreadPoolExecutor(max_workers=5)

class GeminiService:
    def __init__(self):
        self.model_name = "gemini-2.5-flash"
        self.embedding_model = "text-embedding-004"

    async def generate_embedding(self, text: str, *, task: str = "retrieval_document", retry_count: int = 3) -> list[float]:
        """Generate embedding with retry logic and timeout"""
        for attempt in range(retry_count):
            try:
                loop = asyncio.get_event_loop()

                def _embed():
                    task_type_map = {
                        "retrieval_document": "RETRIEVAL_DOCUMENT",
                        "retrieval_query": "RETRIEVAL_QUERY",
                    }
                    task_type = task_type_map.get(task, "RETRIEVAL_DOCUMENT")

                    config = types.EmbedContentConfig(task_type=task_type)
                    if task == "retrieval_document":
                        config = types.EmbedContentConfig(
                            task_type=task_type,
                            title="Embedding of document chunk"
                        )

                    result = client.models.embed_content(
                        model=self.embedding_model,
                        contents=text[:9000],
                        config=config
                    )
                    return result.embeddings[0].values

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

    async def ocr_pdf_page(self, image_bytes: bytes) -> str:
        """Use Gemini vision to extract text from a PDF page image."""
        try:
            loop = asyncio.get_event_loop()

            def _ocr():
                mime_type = "image/jpeg"
                if image_bytes[:4] == b'\x89PNG':
                    mime_type = "image/png"
                elif image_bytes[:2] == b'BM':
                    mime_type = "image/bmp"

                response = client.models.generate_content(
                    model=self.model_name,
                    contents=[
                        """Bu bir PDF sayfasının görüntüsü. Lütfen bu sayfadaki TÜM metni aynen oku ve yaz.

KURALLAR:
- Metni olduğu gibi oku, yorum ekleme
- Tablo varsa düzgün formatla
- Başlıkları ve alt başlıkları koru
- Liste varsa madde işaretlerini koru
- Eğer hiç okunabilir metin yoksa, boş yanıt ver

Sayfa metni:""",
                        types.Part.from_bytes(data=image_bytes, mime_type=mime_type)
                    ]
                )
                return response.text

            result = await asyncio.wait_for(
                loop.run_in_executor(executor, _ocr),
                timeout=60.0
            )
            return result.strip() if result else ""
        except asyncio.TimeoutError:
            print("OCR timeout - page took too long to process")
            return ""
        except Exception as e:
            print(f"Error in OCR: {e}")
            return ""

    async def ocr_pdf_file(self, pdf_bytes: bytes) -> str:
        """Use Gemini to extract ALL text from a PDF file."""
        print(f"[OCR] Starting PDF OCR, file size: {len(pdf_bytes)} bytes")
        try:
            loop = asyncio.get_event_loop()

            def _ocr_pdf():
                print("[OCR] Sending PDF to Gemini...")
                response = client.models.generate_content(
                    model=self.model_name,
                    contents=[
                        """Bu bir PDF dosyası. Lütfen bu PDF'deki TÜM metni oku ve yaz.

KURALLAR:
- Tüm sayfaları oku
- Metni olduğu gibi oku, yorum ekleme
- Tablolar varsa düzgün formatla
- Başlıkları ve alt başlıkları koru
- Listeler varsa madde işaretlerini koru
- Sayfa numaralarını dahil etme
- Eğer hiç okunabilir metin yoksa, boş yanıt ver

PDF içeriği:""",
                        types.Part.from_bytes(data=pdf_bytes, mime_type="application/pdf")
                    ]
                )
                result_text = response.text if response.text else ""
                print(f"[OCR] Gemini returned {len(result_text)} chars")
                return result_text

            print("[OCR] Waiting for Gemini response (timeout: 120s)...")
            result = await asyncio.wait_for(
                loop.run_in_executor(executor, _ocr_pdf),
                timeout=120.0
            )
            print(f"[OCR] OCR complete, extracted {len(result) if result else 0} chars")
            return result.strip() if result else ""
        except asyncio.TimeoutError:
            print("[OCR] TIMEOUT - document took too long to process")
            return ""
        except Exception as e:
            print(f"[OCR] ERROR: {e}")
            import traceback
            traceback.print_exc()
            return ""

    async def extract_text_with_vision(self, problematic_text: str) -> str:
        """Use Gemini to clean/fix problematic text that failed embedding."""
        try:
            loop = asyncio.get_event_loop()

            def _extract():
                response = client.models.generate_content(
                    model=self.model_name,
                    contents=f"""Aşağıdaki metin bir PDF'den çıkarılmış ancak sorunlu olabilir 
(bozuk karakterler, anlamsız semboller vb. içerebilir).

Lütfen bu metinden anlamlı içeriği çıkar ve temiz bir şekilde yeniden yaz.
Eğer metin tamamen anlamsızsa, boş yanıt ver.
Yorum ekleme, sadece temizlenmiş metni ver.

Sorunlu metin:
{problematic_text[:8000]}

Temizlenmiş metin:"""
                )
                return response.text

            result = await asyncio.wait_for(
                loop.run_in_executor(executor, _extract),
                timeout=30.0
            )
            return result.strip() if result else ""
        except Exception as e:
            print(f"Error in extract_text_with_vision: {e}")
            return ""

    async def generate_answer_simple(self, prompt: str) -> str:
        """Direct prompt to Gemini without any wrapper."""
        try:
            loop = asyncio.get_event_loop()

            def _generate():
                response = client.models.generate_content(
                    model=self.model_name,
                    contents=prompt
                )
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
        prompt = f"""Sen yardımcı bir çalışma asistanısın. Aşağıdaki bağlamı OKUYACAK, ANLAYACAK, ve KENDI CÜMLELERINLE AÇIKLAYACAKSSIN.

KURALLAR:
- Türkçe yanıt ver
- Markdown formatı kullan (başlıklar için ##, listeler için -, kod blokları için ```)
- Kod örnekleri varsa, doğru dil etiketiyle kod bloğu kullan (örn: ```csharp, ```python, ```javascript)
- Açık ve anlaşılır ol
- Bağlamda bilgi yoksa, bunu belirt

SORU TİPİNE GÖRE YANITLA:

1. NORMAL SORU (bilgi isteme, tanım, açıklama):
   - SADECE sorulan soruya odaklan
   - Ekstra bilgi, ek açıklama veya ilgisiz detay EKLEME
   - Kısa ve öz yanıt ver
   - "Ayrıca...", "Bunun yanında..." gibi ifadelerle konu dışına ÇIKMA

2. FİKİR/DEĞERLENDİRME SORUSU (ne düşünüyorsun, değerlendirir misin, yorumlar mısın, analiz et, karşılaştır):
   - Bağlamı DERİNLEMESİNE İNCELE
   - Özenli ve kapsamlı bir DEĞERLENDİRME sun
   - Artıları ve eksileri belirt
   - Farklı açılardan analiz yap
   - Kendi yorumunu ve çıkarımlarını ekle
   - Neden-sonuç ilişkilerini göster

PARAPHRASE KURALLARI:
1. Bağlamdaki bilgileri KENDİ KELİMELERİNLE YENIDEN YAZ
2. Aynı anlamı koru, ama FARKLI KELIMELER ve FARKLI YAPIDA CÜMLELERle ifade et
3. GÜNLÜK DİLLE AÇIKLA - akademik değil, öğrenci arkadaşı gibi
4. Minimum %50 değiştirilmiş metin - asla direkt alıntı yapma

Bağlam:
{context}

Kullanıcı Sorusu: {question}

Yanıt:"""

        try:
            loop = asyncio.get_event_loop()

            def _generate():
                response = client.models.generate_content(
                    model=self.model_name,
                    contents=prompt
                )
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

gemini_service = GeminiService()