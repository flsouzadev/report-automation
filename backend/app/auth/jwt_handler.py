"""
Autenticação JWT e verificação de tokens.
"""

import jwt
from datetime import datetime, timedelta
from typing import Optional, Dict
from functools import lru_cache
import logging

from app.core.settings import settings
from app.core.errors import InvalidJWTException

logger = logging.getLogger(__name__)


class JWTHandler:
    """
    Gerencia geração e validação de JWT.
    """
    
    def __init__(self):
        self.secret_key = settings.JWT_SECRET_KEY
        self.algorithm = settings.JWT_ALGORITHM
        self.expiration_minutes = settings.JWT_EXPIRATION_MINUTES
    
    def create_token(
        self,
        user_id: str,
        scopes: list = None,
        expires_delta: Optional[timedelta] = None
    ) -> str:
        """
        Cria um token JWT.
        
        Args:
            user_id: ID do usuário
            scopes: Lista de escopos permitidos
            expires_delta: Tempo de expiração customizado
        
        Returns:
            Token JWT assinado
        """
        if expires_delta is None:
            expires_delta = timedelta(
                minutes=self.expiration_minutes
            )
        
        expire = datetime.utcnow() + expires_delta
        
        payload = {
            "sub": user_id,
            "exp": expire,
            "iat": datetime.utcnow(),
            "scopes": scopes or ["default"],
            "iss": "automation-backend",
            "aud": "automation-app"
        }
        
        token = jwt.encode(
            payload,
            self.secret_key,
            algorithm=self.algorithm
        )
        
        return token
    
    def verify_token(self, token: str) -> Dict:
        """
        Verifica e decodifica um token JWT.
        
        Args:
            token: Token JWT para verificar
        
        Returns:
            Payload do token decodificado
        
        Raises:
            InvalidJWTException: Se token inválido
        """
        try:
            payload = jwt.decode(
                token,
                self.secret_key,
                algorithms=[self.algorithm]
            )
            return payload
        except jwt.ExpiredSignatureError:
            logger.warning(f"Token expirado: {token[:20]}...")
            raise InvalidJWTException()
        except jwt.InvalidTokenError as e:
            logger.warning(f"Token inválido: {str(e)}")
            raise InvalidJWTException()
    
    @staticmethod
    def extract_token_from_header(auth_header: str) -> str:
        """
        Extrai token do header Authorization.
        
        Args:
            auth_header: Header "Authorization: Bearer <token>"
        
        Returns:
            Token extraído
        
        Raises:
            InvalidJWTException: Se formato inválido
        """
        if not auth_header:
            raise InvalidJWTException()
        
        parts = auth_header.split()
        
        if len(parts) != 2 or parts[0].lower() != "bearer":
            raise InvalidJWTException()
        
        return parts[1]


@lru_cache(maxsize=1)
def get_jwt_handler() -> JWTHandler:
    """Retorna instância singleton do JWTHandler."""
    return JWTHandler()


async def verify_jwt(token: str) -> Dict:
    """
    Dependency para verificar JWT em endpoints.
    
    Uso:
        @app.get("/protected")
        async def protected_route(user: dict = Depends(verify_jwt)):
            return {"user": user}
    """
    handler = get_jwt_handler()
    return handler.verify_token(token)
