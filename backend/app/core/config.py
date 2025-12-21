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
    
    # Database & Services
    SUPABASE_URL: str
    SUPABASE_KEY: str
    GEMINI_API_KEY: str
    DEEPSEEK_API_KEY: str | None = None  # Optional - for economic AI mode
    DATABASE_URL: str
    SUPABASE_STORAGE_BUCKET: str = "course_materials"
    
    # Debug mode - set to False in production
    DEBUG_MODE: bool = False

    class Config:
        case_sensitive = True
        env_file = ".env"

settings = Settings()
