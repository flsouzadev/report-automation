"""
FastAPI application entry point.
Configuração central e inicialização do servidor.
"""

import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZIPMiddleware
from fastapi.responses import JSONResponse

from app.core.settings import settings
from app.core.logging import setup_logging
from app.middleware.auth_middleware import AuthMiddleware
from app.middleware.error_middleware import ErrorHandlingMiddleware
from app.api.v1 import routes as v1_routes

# Setup logging
setup_logging()
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Gerencia ciclo de vida da aplicação.
    
    Startup: inicializa recursos
    Shutdown: libera recursos
    """
    # Startup
    logger.info("Iniciando aplicação FastAPI")
    logger.info(f"Ambiente: {settings.ENVIRONMENT}")
    logger.info(f"Debug: {settings.DEBUG}")
    
    yield
    
    # Shutdown
    logger.info("Encerrando aplicação FastAPI")


# Criar aplicação
app = FastAPI(
    title="Automation Backend - Relatórios Jira",
    description="Backend para geração de relatórios Jira com Python/FastAPI",
    version="1.0.0",
    lifespan=lifespan
)

# Middleware - CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
    max_age=600,
)

# Middleware - Compressão
app.add_middleware(
    GZIPMiddleware,
    minimum_size=1000,
)

# Middleware - Tratamento de erros (deve vir por último)
app.add_middleware(ErrorHandlingMiddleware)

# Middleware - Autenticação JWT
app.add_middleware(AuthMiddleware)


# Health check
@app.get("/health", tags=["health"])
async def health_check():
    """Verifica saúde da aplicação."""
    return {
        "status": "healthy",
        "environment": settings.ENVIRONMENT,
        "version": "1.0.0"
    }


@app.get("/ready", tags=["health"])
async def readiness_check():
    """Verifica se aplicação está pronta para tráfego."""
    return {
        "ready": True,
        "timestamp": "2024-01-01T00:00:00Z"
    }


# Incluir rotas v1
app.include_router(v1_routes.router, prefix="/api/v1")


if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "main:app",
        host=settings.BACKEND_HOST,
        port=settings.BACKEND_PORT,
        workers=settings.BACKEND_WORKERS,
        reload=settings.DEBUG,
        log_level=settings.LOG_LEVEL.lower()
    )
