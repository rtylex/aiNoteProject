"""
DeepSeek AI Service for economic chat mode.

This service provides an alternative to Gemini for chat/Q&A operations,
using the DeepSeek API which is OpenAI SDK compatible.

CACHE OPTIMIZATION:
DeepSeek caches message prefixes. By keeping system prompt and document context
in separate, consistent messages, subsequent questions for the same document
will hit the cache and cost ~90% less.

Message structure for cache optimization:
1. System message (FIXED) - always the same
2. Document context (FIXED per document) - normalized text
3. User question (VARIABLE) - only this changes
"""
import asyncio
import re
import unicodedata
from concurrent.futures import ThreadPoolExecutor
from openai import OpenAI
from app.core.config import settings

# Thread pool for blocking API calls
executor = ThreadPoolExecutor(max_workers=3)

# Fixed system prompts for cache consistency
SYSTEM_PROMPT_SINGLE = """Sen akademik konularda uzman, yardımcı bir Türkçe asistansın.

KURALLAR:
- Türkçe yanıt ver
- Bağlamdaki bilgileri kullan
- Bağlamda yoksa "Bu konuda bilgi bulamadım" de
- Kısa ve öz yanıtlar ver
- Önemli kavramları **kalın** yap
- Gerekirse başlıklar kullan
- Markdown formatını kullan"""

SYSTEM_PROMPT_MULTI = """Sen akademik düzeyde bilgiye sahip, uzman bir çalışma asistanısın. Kaynakları REFERANS olarak kullan.

SORU TİPİNE GÖRE YANITLA:

1. NORMAL SORU (bilgi isteme, tanım, açıklama):
   - SADECE sorulan soruya odaklan
   - Ekstra bilgi, ek açıklama veya ilgisiz detay EKLEME
   - Kısa ve öz yanıt ver

2. FİKİR/DEĞERLENDİRME SORUSU (ne düşünüyorsun, değerlendirir misin, analiz et):
   - Kaynakları DERİNLEMESİNE İNCELE
   - Özenli ve kapsamlı bir DEĞERLENDİRME sun
   - Artıları ve eksileri belirt

FORMATLAMA:
- Türkçe yanıt ver
- Önemli kavramları **kalın** yap
- Gerekirse ## başlık ve ### alt başlık kullan
- Kod varsa ``` bloğu kullan"""


def normalize_text_for_cache(text: str) -> str:
    """
    Normalize text to ensure consistent cache hits.
    Even a single space difference can break the cache!
    
    This function:
    1. Normalizes Unicode characters
    2. Removes extra whitespace
    3. Trims the text
    4. Ensures consistent line endings
    """
    if not text:
        return ""
    
    # Normalize Unicode (NFC form for consistency)
    text = unicodedata.normalize('NFC', text)
    
    # Replace multiple spaces with single space
    text = re.sub(r' +', ' ', text)
    
    # Replace multiple newlines with double newline (paragraph break)
    text = re.sub(r'\n{3,}', '\n\n', text)
    
    # Remove trailing whitespace from each line
    lines = [line.rstrip() for line in text.split('\n')]
    text = '\n'.join(lines)
    
    # Final trim
    return text.strip()


class DeepSeekService:
    """
    DeepSeek API service for chat completions with prefix caching optimization.
    
    Cache Strategy:
    - System prompt is FIXED (always the same)
    - Document context is FIXED per document (normalized)
    - Only the question changes between requests
    
    This allows DeepSeek to cache the prefix (system + context) and only
    process the new question, reducing costs significantly.
    """
    
    def __init__(self):
        self.enabled = bool(settings.DEEPSEEK_API_KEY)
        self.client = None
        self.model = "deepseek-chat"  # DeepSeek-V3.2
        
        if self.enabled:
            self.client = OpenAI(
                api_key=settings.DEEPSEEK_API_KEY,
                base_url="https://api.deepseek.com"
            )
            print("[DeepSeek] Service initialized with cache optimization")
        else:
            print("[DeepSeek] Service disabled - no API key configured")
    
    async def generate_answer(self, question: str, context: str) -> str:
        """
        Generate an answer using DeepSeek with cache-optimized message structure.
        
        Message order (for prefix caching):
        1. System message - FIXED
        2. Document context - FIXED per document (normalized)
        3. User question - VARIABLE
        """
        if not self.enabled or not self.client:
            raise ValueError("DeepSeek service is not enabled")
        
        # Normalize context for consistent cache hits
        normalized_context = normalize_text_for_cache(context)
        
        try:
            loop = asyncio.get_event_loop()
            
            def _generate():
                # Cache-optimized message structure:
                # 1. System (FIXED) + 2. Context (FIXED per doc) = CACHED
                # 3. Question (VARIABLE) = Only this is processed fresh
                messages = [
                    {"role": "system", "content": SYSTEM_PROMPT_SINGLE},
                    {"role": "user", "content": f"DOKÜMAN İÇERİĞİ:\n\n{normalized_context}"},
                    {"role": "user", "content": f"SORU: {question}"}
                ]
                
                response = self.client.chat.completions.create(
                    model=self.model,
                    messages=messages,
                    temperature=0.7,
                    max_tokens=2048
                )
                return response.choices[0].message.content
            
            result = await asyncio.wait_for(
                loop.run_in_executor(executor, _generate),
                timeout=60.0
            )
            return result.strip() if result else ""
            
        except asyncio.TimeoutError:
            print("[DeepSeek] TIMEOUT - request took too long")
            raise
        except Exception as e:
            print(f"[DeepSeek] ERROR: {e}")
            raise
    
    async def generate_answer_with_context(
        self, 
        question: str, 
        context: str,
        chat_history: list[dict] | None = None
    ) -> str:
        """
        Generate an answer with optional chat history for cache optimization.
        
        For multi-turn conversations, include chat history to maintain context
        while still benefiting from prefix caching.
        
        Args:
            question: User's current question
            context: Document content (will be normalized)
            chat_history: Optional list of previous messages [{"role": "user/assistant", "content": "..."}]
        """
        if not self.enabled or not self.client:
            raise ValueError("DeepSeek service is not enabled")
        
        normalized_context = normalize_text_for_cache(context)
        
        try:
            loop = asyncio.get_event_loop()
            
            def _generate():
                # Build message list with cache optimization
                messages = [
                    {"role": "system", "content": SYSTEM_PROMPT_SINGLE},
                    {"role": "user", "content": f"DOKÜMAN İÇERİĞİ:\n\n{normalized_context}"},
                ]
                
                # Add chat history if provided (for multi-turn)
                if chat_history:
                    for msg in chat_history[-6:]:  # Last 6 messages max
                        role = "assistant" if msg.get("role") == "assistant" or msg.get("sender") == "ai" else "user"
                        messages.append({"role": role, "content": msg.get("content", msg.get("message", ""))})
                
                # Add current question
                messages.append({"role": "user", "content": f"SORU: {question}"})
                
                response = self.client.chat.completions.create(
                    model=self.model,
                    messages=messages,
                    temperature=0.7,
                    max_tokens=2048
                )
                return response.choices[0].message.content
            
            result = await asyncio.wait_for(
                loop.run_in_executor(executor, _generate),
                timeout=60.0
            )
            return result.strip() if result else ""
            
        except asyncio.TimeoutError:
            print("[DeepSeek] TIMEOUT - request took too long")
            raise
        except Exception as e:
            print(f"[DeepSeek] ERROR: {e}")
            raise
    
    async def generate_answer_simple(self, prompt: str) -> str:
        """
        Direct prompt to DeepSeek without any wrapper.
        Used for multi-document chat where the prompt is already formatted.
        
        Note: This method is less cache-efficient. Consider using
        generate_answer_multi_doc for better caching.
        """
        if not self.enabled or not self.client:
            raise ValueError("DeepSeek service is not enabled")
        
        try:
            loop = asyncio.get_event_loop()
            
            def _generate():
                response = self.client.chat.completions.create(
                    model=self.model,
                    messages=[
                        {"role": "system", "content": SYSTEM_PROMPT_MULTI},
                        {"role": "user", "content": prompt}
                    ],
                    temperature=0.7,
                    max_tokens=4096
                )
                return response.choices[0].message.content
            
            result = await asyncio.wait_for(
                loop.run_in_executor(executor, _generate),
                timeout=90.0
            )
            return result.strip() if result else ""
            
        except asyncio.TimeoutError:
            print("[DeepSeek] TIMEOUT - request took too long")
            raise
        except Exception as e:
            print(f"[DeepSeek] ERROR: {e}")
            raise
    
    async def generate_answer_multi_doc(
        self, 
        question: str, 
        combined_context: str
    ) -> str:
        """
        Cache-optimized version for multi-document chat.
        
        Message order:
        1. System message with multi-doc instructions - FIXED
        2. Combined document context - FIXED per session
        3. User question - VARIABLE
        """
        if not self.enabled or not self.client:
            raise ValueError("DeepSeek service is not enabled")
        
        normalized_context = normalize_text_for_cache(combined_context)
        
        try:
            loop = asyncio.get_event_loop()
            
            def _generate():
                messages = [
                    {"role": "system", "content": SYSTEM_PROMPT_MULTI},
                    {"role": "user", "content": f"KAYNAK MATERYALLERİ:\n\n{normalized_context}"},
                    {"role": "user", "content": f"SORU: {question}"}
                ]
                
                response = self.client.chat.completions.create(
                    model=self.model,
                    messages=messages,
                    temperature=0.7,
                    max_tokens=4096
                )
                return response.choices[0].message.content
            
            result = await asyncio.wait_for(
                loop.run_in_executor(executor, _generate),
                timeout=90.0
            )
            return result.strip() if result else ""
            
        except asyncio.TimeoutError:
            print("[DeepSeek] TIMEOUT - request took too long")
            raise
        except Exception as e:
            print(f"[DeepSeek] ERROR: {e}")
            raise


# Singleton instance
deepseek_service = DeepSeekService()
