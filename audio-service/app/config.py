from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    openai_api_key: str = ""
    gemini_api_key: str = ""
    supabase_url: str = ""
    supabase_key: str = ""
    supabase_anon_key: str = ""
    supabase_service_role_key: str = ""
    default_ai_provider: str = "openai"

    class Config:
        env_file = ".env"
        extra = "ignore"


@lru_cache
def get_settings() -> Settings:
    return Settings()
