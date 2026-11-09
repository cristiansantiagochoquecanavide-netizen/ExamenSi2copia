from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator


class Settings(BaseSettings):
    PROJECT_NAME: str = "FashionStore API"
    VERSION: str = "1.0.0"
    DESCRIPTION: str = "Plataforma Inteligente de Comercio Electronico con Realidad Aumentada e IA"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    API_V1_STR: str = "/api/v1"

    # PostgreSQL Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/fashionstore_db"
    DATABASE_ECHO: bool = False

    # Security
    SECRET_KEY: str = "super-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 horas para entorno de desarrollo y pruebas

    # Stripe Payment Gateway
    STRIPE_SECRET_KEY: str = ""
    STRIPE_PUBLISHABLE_KEY: str = ""
    STRIPE_CURRENCY: str = "bob"

    # Google Gemini AI (Presentación 3 - CU21)
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-1.5-flash"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="allow"
    )

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def assemble_db_connection(cls, v: str | None) -> str:
        if isinstance(v, str) and v.strip():
            url = v.strip()
            # Render / Heroku / Supabase proveen postgres:// o postgresql://
            # SQLAlchemy 2.0 con asyncpg requiere postgresql+asyncpg://
            if url.startswith("postgres://"):
                url = url.replace("postgres://", "postgresql+asyncpg://", 1)
            elif url.startswith("postgresql://") and not url.startswith("postgresql+asyncpg://"):
                url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
            # asyncpg requiere ssl en lugar de sslmode=require
            if "sslmode=require" in url:
                url = url.replace("sslmode=require", "ssl=require")
            return url
        return "postgresql+asyncpg://postgres:postgres@localhost:5432/fashionstore_db"


settings = Settings()
