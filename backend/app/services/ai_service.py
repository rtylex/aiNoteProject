"""
AI Service - Unified interface for AI model selection.

This wrapper service allows switching between Gemini and DeepSeek
based on user preference, providing a consistent interface for chat operations.

CACHE OPTIMIZATION:
DeepSeek supports prefix caching. The new generate_answer_multi_doc method
separates context and question to enable caching of the fixed context prefix.
"""
from app.services.gemini_service import gemini_service
from app.services.deepseek_service import deepseek_service


class ModelUnavailableError(Exception):
    """Raised when the selected AI model is unavailable or fails."""
    def __init__(self, model: str, message: str = None):
        self.model = model
        self.message = message or f"{model} modeli şu anda kullanılamıyor"
        super().__init__(self.message)


class AIService:
    """Unified AI service that routes requests to the appropriate model."""
    
    def __init__(self):
        self.gemini = gemini_service
        self.deepseek = deepseek_service
        print(f"[AIService] Initialized - DeepSeek enabled: {self.deepseek.enabled}")
    
    def is_deepseek_available(self) -> bool:
        """Check if DeepSeek is configured and available."""
        return self.deepseek.enabled
    
    async def generate_answer(self, question: str, context: str, model: str = "deepseek") -> str:
        """
        Generate an answer using the specified model.
        
        Args:
            question: User's question
            context: Retrieved context from documents
            model: "gemini" or "deepseek" (default: deepseek)
        
        Returns:
            AI-generated answer
            
        Raises:
            ModelUnavailableError: If the selected model fails
        """
        if model == "deepseek":
            if not self.deepseek.enabled:
                raise ModelUnavailableError("DeepSeek", "DeepSeek API yapılandırılmamış")
            try:
                return await self.deepseek.generate_answer(question, context)
            except Exception as e:
                print(f"[AIService] DeepSeek failed: {e}")
                raise ModelUnavailableError("DeepSeek", str(e))
        
        # Gemini
        try:
            return await self.gemini.generate_answer(question, context)
        except Exception as e:
            print(f"[AIService] Gemini failed: {e}")
            raise ModelUnavailableError("Gemini", str(e))
    
    async def generate_answer_simple(self, prompt: str, model: str = "deepseek") -> str:
        """
        Direct prompt to AI without wrapper (for multi-document chat).
        
        Args:
            prompt: Pre-formatted prompt
            model: "gemini" or "deepseek" (default: deepseek)
        
        Returns:
            AI-generated response
            
        Raises:
            ModelUnavailableError: If the selected model fails
        """
        if model == "deepseek":
            if not self.deepseek.enabled:
                raise ModelUnavailableError("DeepSeek", "DeepSeek API yapılandırılmamış")
            try:
                return await self.deepseek.generate_answer_simple(prompt)
            except Exception as e:
                print(f"[AIService] DeepSeek failed: {e}")
                raise ModelUnavailableError("DeepSeek", str(e))
        
        # Gemini
        try:
            return await self.gemini.generate_answer_simple(prompt)
        except Exception as e:
            print(f"[AIService] Gemini failed: {e}")
            raise ModelUnavailableError("Gemini", str(e))
    
    async def generate_answer_multi_doc(
        self, 
        question: str, 
        combined_context: str, 
        model: str = "deepseek"
    ) -> str:
        """
        Cache-optimized answer generation for multi-document chat.
        
        This method separates context and question to enable DeepSeek's
        prefix caching. The context is sent as a separate message that
        can be cached across multiple questions.
        
        Args:
            question: User's question
            combined_context: Combined context from all documents
            model: "gemini" or "deepseek" (default: deepseek)
        
        Returns:
            AI-generated response
            
        Raises:
            ModelUnavailableError: If the selected model fails
        """
        if model == "deepseek":
            if not self.deepseek.enabled:
                raise ModelUnavailableError("DeepSeek", "DeepSeek API yapılandırılmamış")
            try:
                # Use cache-optimized method
                return await self.deepseek.generate_answer_multi_doc(question, combined_context)
            except Exception as e:
                print(f"[AIService] DeepSeek failed: {e}")
                raise ModelUnavailableError("DeepSeek", str(e))
        
        # Gemini - fallback to simple method (no prefix caching)
        try:
            prompt = f"""Kaynak Materyalleri:
{combined_context}

Kullanıcı Sorusu: {question}

Yanıt:"""
            return await self.gemini.generate_answer_simple(prompt)
        except Exception as e:
            print(f"[AIService] Gemini failed: {e}")
            raise ModelUnavailableError("Gemini", str(e))


# Singleton instance
ai_service = AIService()
