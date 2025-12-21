"""
AI Service - Unified interface for AI model selection.

This wrapper service allows switching between Gemini and DeepSeek
based on user preference, providing a consistent interface for chat operations.
"""
from app.services.gemini_service import gemini_service
from app.services.deepseek_service import deepseek_service


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
        """
        if model == "deepseek" and self.deepseek.enabled:
            try:
                return await self.deepseek.generate_answer(question, context)
            except Exception as e:
                print(f"[AIService] DeepSeek failed, falling back to Gemini: {e}")
                # Fallback to Gemini if DeepSeek fails
                return await self.gemini.generate_answer(question, context)
        
        return await self.gemini.generate_answer(question, context)
    
    async def generate_answer_simple(self, prompt: str, model: str = "deepseek") -> str:
        """
        Direct prompt to AI without wrapper (for multi-document chat).
        
        Args:
            prompt: Pre-formatted prompt
            model: "gemini" or "deepseek" (default: deepseek)
        
        Returns:
            AI-generated response
        """
        if model == "deepseek" and self.deepseek.enabled:
            try:
                return await self.deepseek.generate_answer_simple(prompt)
            except Exception as e:
                print(f"[AIService] DeepSeek failed, falling back to Gemini: {e}")
                # Fallback to Gemini if DeepSeek fails
                return await self.gemini.generate_answer_simple(prompt)
        
        return await self.gemini.generate_answer_simple(prompt)


# Singleton instance
ai_service = AIService()
