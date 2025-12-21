"""
DeepSeek AI Service for economic chat mode.

This service provides an alternative to Gemini for chat/Q&A operations,
using the DeepSeek API which is OpenAI SDK compatible.
"""
import asyncio
from concurrent.futures import ThreadPoolExecutor
from openai import OpenAI
from app.core.config import settings

# Thread pool for blocking API calls
executor = ThreadPoolExecutor(max_workers=3)


class DeepSeekService:
    """DeepSeek API service for chat completions."""
    
    def __init__(self):
        self.enabled = bool(settings.DEEPSEEK_API_KEY)
        self.client = None
        self.model = "deepseek-chat"  # DeepSeek-V3.2
        
        if self.enabled:
            self.client = OpenAI(
                api_key=settings.DEEPSEEK_API_KEY,
                base_url="https://api.deepseek.com"
            )
            print("[DeepSeek] Service initialized successfully")
        else:
            print("[DeepSeek] Service disabled - no API key configured")
    
    async def generate_answer(self, question: str, context: str) -> str:
        """
        Generate an answer using DeepSeek with the same prompt structure as Gemini.
        """
        if not self.enabled or not self.client:
            raise ValueError("DeepSeek service is not enabled")
        
        prompt = f"""Sen bir yardımcı asistansın. Aşağıdaki bağlam bilgisini kullanarak soruyu yanıtla.

KURALLAR:
- Türkçe yanıt ver
- Bağlamdaki bilgileri kullan
- Bağlamda yoksa "Bu konuda bilgi bulamadım" de
- Kısa ve öz yanıtlar ver
- Önemli kavramları **kalın** yap
- Gerekirse başlıklar kullan

BAĞLAM:
{context}

SORU: {question}

YANIT:"""

        try:
            loop = asyncio.get_event_loop()
            
            def _generate():
                response = self.client.chat.completions.create(
                    model=self.model,
                    messages=[
                        {"role": "system", "content": "Sen akademik konularda uzman, yardımcı bir Türkçe asistansın."},
                        {"role": "user", "content": prompt}
                    ],
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
        """
        if not self.enabled or not self.client:
            raise ValueError("DeepSeek service is not enabled")
        
        try:
            loop = asyncio.get_event_loop()
            
            def _generate():
                response = self.client.chat.completions.create(
                    model=self.model,
                    messages=[
                        {"role": "system", "content": "Sen akademik düzeyde bilgiye sahip, uzman bir çalışma asistanısın."},
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


# Singleton instance
deepseek_service = DeepSeekService()
