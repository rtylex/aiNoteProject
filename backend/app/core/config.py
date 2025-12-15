from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "AI Note Project"
    PROJECT_VERSION: str = "0.1.0"
    API_V1_STR: str = "/api/v1"
    
    SUPABASE_URL: str
    SUPABASE_KEY: str
    GEMINI_API_KEY: str
    DATABASE_URL: str
    SUPABASE_STORAGE_BUCKET: str = "course_materials"

    class Config:
        case_sensitive = True
        env_file = ".env"

settings = Settings()
