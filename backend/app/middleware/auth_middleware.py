"""
Middleware para autenticação JWT.
"""

import logging
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

from app.auth.jwt_handler import get_jwt_handler
from app.core.errors import InvalidJWTException

logger = logging.getLogger(__name__)


class AuthMiddleware(BaseHTTPMiddleware):
    """
    Middleware para validar JWT em requisições.
    
    Endpoints excludentes:
    - /health
    - /ready
    - /docs
    - /openapi.json
    """
    
    EXCLUDED_PATHS = {"/health", "/ready", "/docs", "/openapi.json"}
    
    async def dispatch(self, request: Request, call_next):
        """Intercepta e valida requisição."""
        
        # Pular validação para endpoints excludentes
        if request.url.path in self.EXCLUDED_PATHS:
            return await call_next(request)
        
        # Obter token do header
        auth_header = request.headers.get("Authorization")
        
        if not auth_header:
            return JSONResponse(
                status_code=401,
                content={"detail": "Missing Authorization header"}
            )
        
        try:
            # Extrair e validar token
            handler = get_jwt_handler()
            token = handler.extract_token_from_header(auth_header)
            payload = handler.verify_token(token)
            
            # Adicionar dados do token ao request
            request.state.user = payload
            request.state.user_id = payload.get("sub")
            request.state.scopes = payload.get("scopes", [])
            
        except InvalidJWTException:
            return JSONResponse(
                status_code=401,
                content={"detail": "Invalid or expired token"}
            )
        
        # Continuar requisição
        response = await call_next(request)
        return response
