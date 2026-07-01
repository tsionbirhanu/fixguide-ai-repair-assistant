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


class Settings(BaseSettings):
    """
    Application settings loaded from environment variables
    """
    
    # API Configuration
    API_HOST: str = "0.0.0.0"
    API_PORT: int = 8000
    DEBUG: bool = True
    
    # CORS Configuration
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:5173"
    
    # LangGraph Configuration
    LANGCHAIN_API_KEY: str = ""
    LANGCHAIN_TRACING_V2: str = "false"
    LANGCHAIN_PROJECT: str = "fixguide-ai"
    
    # Gemini Configuration
    GEMINI_API_KEY: str = ""
    
    # iFixit API Configuration
    IFIXIT_API_KEY: str = ""
    
    # Supabase Configuration
    SUPABASE_URL: str = ""
    SUPABASE_ANON_KEY: str = ""
    SUPABASE_SERVICE_KEY: str = ""
    
    # Demo auth - use when Supabase is unreachable (local dev, no internet)
    DEMO_AUTH: bool = False
    
    # Tavily Search API (for web search fallback)
    TAVILY_API_KEY: str = ""

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
        falsy = {"0", "false", "f", "no", "n", "off", "release", "prod", "production"}

        if normalized in truthy:
            return True
        if normalized in falsy:
            return False
        return value
    
    @property
    def cors_origins_list(self) -> List[str]:
        """Parse CORS_ORIGINS into a list"""
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]
    
    class Config:
        env_file = ".env"
        case_sensitive = True


# Global settings instance
settings = Settings()
