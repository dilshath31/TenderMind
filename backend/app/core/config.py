from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "TenderMind API"
    API_V1_STR: str = "/api/v1"
    
    POSTGRES_USER: str = "tendermind_user"
    POSTGRES_PASSWORD: str = "tendermind_pass"
    POSTGRES_DB: str = "tendermind_db"
    POSTGRES_HOST: str = "postgres"
    POSTGRES_PORT: str = "5432"
    
    DATABASE_URL: str
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 8  # 8 days
    
    REDIS_URL: str

    # ── Groq API (free tier, replaces local LLM) ──────────────────────────
    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "llama3-8b-8192"
    GROQ_API_URL: str = "https://api.groq.com/openai/v1/chat/completions"

    FRONTEND_URL: str = "http://localhost:5173"

    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
