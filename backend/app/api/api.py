from fastapi import APIRouter
from app.api.endpoints import auth, documents, chat, admin, setup, test, flashcard

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(documents.router, prefix="/documents", tags=["documents"])
api_router.include_router(chat.router, prefix="/chat", tags=["chat"])
api_router.include_router(admin.router, prefix="/admin", tags=["admin"])
api_router.include_router(setup.router, prefix="/setup", tags=["setup"])
api_router.include_router(test.router, prefix="/test", tags=["test"])
api_router.include_router(flashcard.router, prefix="/flashcard", tags=["flashcard"])

