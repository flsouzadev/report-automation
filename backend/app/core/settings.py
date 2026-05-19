"""
Configuração central da aplicação.
Gerencia variáveis de ambiente e settings.
"""

from pydantic_settings import BaseSettings
from typing import List
import os


class Settings(BaseSettings):
    """Configurações da aplicação."""
    
    # Ambiente
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    DEBUG: bool = os.getenv("DEBUG", "true").lower() == "true"
    
    # Google Cloud
    GCP_PROJECT_ID: str = os.getenv("GCP_PROJECT_ID", "your-project-id")
    GCP_REGION: str = os.getenv("GCP_REGION", "us-central1")
    
    # Jira
    JIRA_URL: str = os.getenv("JIRA_URL", "https://company.atlassian.net")
    JIRA_USERNAME: str = os.getenv("JIRA_USERNAME", "")
    JIRA_TOKEN: str = os.getenv("JIRA_TOKEN", "")
    
    # Backend
    BACKEND_HOST: str = os.getenv("BACKEND_HOST", "0.0.0.0")
    BACKEND_PORT: int = int(os.getenv("BACKEND_PORT", "8000"))
    BACKEND_WORKERS: int = int(os.getenv("BACKEND_WORKERS", "4"))
    
    # JWT
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "change-this-secret-key")
    JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
    JWT_EXPIRATION_MINUTES: int = int(os.getenv("JWT_EXPIRATION_MINUTES", "60"))
    
    # CORS
    CORS_ORIGINS: List[str] = [
        "https://docs.google.com",
        "https://sheets.google.com",
    ]
    
    # Redis
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379")
    REDIS_ENABLED: bool = os.getenv("REDIS_ENABLED", "false").lower() == "true"
    
    # Logging
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")
    LOG_FORMAT: str = os.getenv("LOG_FORMAT", "json")
    
    # Rate Limiting
    RATE_LIMIT_ENABLED: bool = os.getenv("RATE_LIMIT_ENABLED", "true").lower() == "true"
    RATE_LIMIT_REQUESTS: int = int(os.getenv("RATE_LIMIT_REQUESTS", "100"))
    RATE_LIMIT_PERIOD: int = int(os.getenv("RATE_LIMIT_PERIOD", "60"))
    
    class Config:
        env_file = ".env"
        case_sensitive = True


# Singleton
settings = Settings()
