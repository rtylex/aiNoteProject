from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    PROJECT_NAME: str = "YirikAI"
    PROJECT_VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Server settings
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    
    # CORS - Frontend URLs that can access the API
    ALLOWED_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000"
    
    # Database (PostgreSQL)
    DATABASE_URL: str
    
    # JWT Auth
    SECRET_KEY: str = "change-me-to-a-random-secret-key"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # AI Services
    GEMINI_API_KEY: str
    DEEPSEEK_API_KEY: str | None = None  # Optional - for economic AI mode
    
    # File Storage
    UPLOAD_DIR: str = "uploads"
    
    # Debug mode - set to False in production
    DEBUG_MODE: bool = False

    class Config:
        case_sensitive = True
        env_file = ".env"

settings = Settings()

