"""
Middleware para tratamento de erros.
"""

import logging
import traceback
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

logger = logging.getLogger(__name__)


class ErrorHandlingMiddleware(BaseHTTPMiddleware):
    """
    Middleware para capturar e logar exceções.
    """
    
    async def dispatch(self, request: Request, call_next):
        """Intercepta e trata erros."""
        
        try:
            response = await call_next(request)
            return response
            
        except Exception as exc:
            # Log do erro
            logger.error(
                f"Unhandled exception in {request.method} {request.url.path}",
                exc_info=exc,
                extra={
                    "method": request.method,
                    "path": request.url.path,
                    "query": str(request.url.query),
                }
            )
            
            # Retornar erro genérico em produção
            return JSONResponse(
                status_code=500,
                content={
                    "detail": "Internal server error",
                    "request_id": request.headers.get("x-request-id", "unknown")
                }
            )
