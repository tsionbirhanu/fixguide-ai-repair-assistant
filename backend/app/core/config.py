"""
Configuration Management
Loads and validates environment variables using Pydantic
"""

from pydantic_settings import BaseSettings
from pydantic import field_validator
from typing import List
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

DEFAULT_CORS_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:5173",
    "https://fixguide-ai-repair-assistant.vercel.app",
]


class Settings(BaseSettings):
    """
    Application settings loaded from environment variables
    """
    
    # API Configuration
    API_HOST: str = "0.0.0.0"
    API_PORT: int = 8000
    DEBUG: bool = True
    
    # CORS Configuration
    CORS_ORIGINS: str = ",".join(DEFAULT_CORS_ORIGINS)
    
    # LangGraph Configuration
    LANGCHAIN_API_KEY: str = ""
    LANGCHAIN_TRACING_V2: str = "false"
    LANGCHAIN_PROJECT: str = "fixguide-ai"
    
    # Gemini Configuration
    GEMINI_API_KEY: str = ""
    GEMINI_API_KEYS: str = ""
    
    # iFixit API Configuration
    IFIXIT_API_KEY: str = ""
    IFIXIT_API_KEYS: str = ""
    IFIXIT_APP_ID: str = ""
    IFIXIT_APP_IDS: str = ""
    
    # Supabase Configuration
    SUPABASE_URL: str = ""
    SUPABASE_ANON_KEY: str = ""
    SUPABASE_SERVICE_KEY: str = ""
    
    # Demo auth - use when Supabase is unreachable (local dev, no internet)
    DEMO_AUTH: bool = False
    
    # Tavily Search API (for web search fallback)
    TAVILY_API_KEY: str = ""
    TAVILY_API_KEYS: str = ""

    @field_validator("DEBUG", "DEMO_AUTH", mode="before")
    @classmethod
    def parse_bool_env(cls, value):
        """Accept common deployment words for boolean env vars."""
        if isinstance(value, bool):
            return value
        if value is None or value == "":
            return value

        normalized = str(value).strip().lower()
        truthy = {"1", "true", "t", "yes", "y", "on", "debug", "dev", "development"}
        falsy = {
            "0",
            "false",
            "f",
            "no",
            "n",
            "off",
            "release",
            "prod",
            "production",
            "info",
            "warn",
            "warning",
            "error",
        }

        if normalized in truthy:
            return True
        if normalized in falsy:
            return False
        return value
    
    @property
    def cors_origins_list(self) -> List[str]:
        """Parse CORS_ORIGINS into a list"""
        origins = []
        for origin in [*DEFAULT_CORS_ORIGINS, *(self.CORS_ORIGINS or "").split(",")]:
            clean_origin = origin.strip().rstrip("/")
            if clean_origin and clean_origin not in origins:
                origins.append(clean_origin)
        return origins

    @staticmethod
    def _split_keys(value: str) -> List[str]:
        placeholders = {
            "your_gemini_api_key_here",
            "your_gemini_flash_2_5_key_here",
            "your_tavily_api_key_here",
            "your_ifixit_api_key_here",
            "your_ifixit_app_id_here",
            "your_key_1",
            "your_key_2",
        }
        keys = []
        for key in (value or "").replace("\n", ",").split(","):
            clean_key = key.strip()
            if clean_key and clean_key not in placeholders:
                keys.append(clean_key)
        return keys

    @property
    def gemini_api_keys_list(self) -> List[str]:
        """Return Gemini keys, preferring the multi-key rotation env var."""
        keys = self._split_keys(self.GEMINI_API_KEYS)
        if keys:
            return keys
        return self._split_keys(self.GEMINI_API_KEY)

    @property
    def tavily_api_keys_list(self) -> List[str]:
        """Return Tavily keys, preferring the multi-key rotation env var."""
        keys = self._split_keys(self.TAVILY_API_KEYS)
        if keys:
            return keys
        return self._split_keys(self.TAVILY_API_KEY)

    @property
    def ifixit_app_ids_list(self) -> List[str]:
        """Return optional iFixit App IDs for integrations that receive them."""
        for value in (
            self.IFIXIT_APP_IDS,
            self.IFIXIT_API_KEYS,
            self.IFIXIT_APP_ID,
            self.IFIXIT_API_KEY,
        ):
            keys = self._split_keys(value)
            if keys:
                return keys
        return []
    
    class Config:
        env_file = ".env"
        case_sensitive = True


# Global settings instance
settings = Settings()
