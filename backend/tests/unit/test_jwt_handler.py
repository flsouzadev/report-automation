"""
Teste de exemplo para JWT Handler.
"""

import pytest
from datetime import datetime, timedelta
from app.auth.jwt_handler import JWTHandler, get_jwt_handler
from app.core.errors import InvalidJWTException


class TestJWTHandler:
    """Testes para JWT Handler."""
    
    @pytest.fixture
    def handler(self):
        """Cria instância de JWTHandler para testes."""
        return JWTHandler()
    
    def test_create_token(self, handler):
        """Testa criação de token JWT."""
        user_id = "test@example.com"
        token = handler.create_token(user_id)
        
        assert token is not None
        assert isinstance(token, str)
        assert len(token) > 0
    
    def test_verify_valid_token(self, handler):
        """Testa verificação de token válido."""
        user_id = "test@example.com"
        scopes = ["report:generate"]
        token = handler.create_token(user_id, scopes=scopes)
        
        payload = handler.verify_token(token)
        
        assert payload["sub"] == user_id
        assert payload["scopes"] == scopes
        assert "exp" in payload
    
    def test_verify_invalid_token(self, handler):
        """Testa que token inválido levanta exceção."""
        with pytest.raises(InvalidJWTException):
            handler.verify_token("invalid.token.here")
    
    def test_verify_expired_token(self, handler):
        """Testa que token expirado levanta exceção."""
        user_id = "test@example.com"
        expires_delta = timedelta(seconds=-1)  # Token já expirou
        token = handler.create_token(user_id, expires_delta=expires_delta)
        
        with pytest.raises(InvalidJWTException):
            handler.verify_token(token)
    
    def test_extract_token_from_header(self, handler):
        """Testa extração de token do header."""
        token = "my.jwt.token"
        header = f"Bearer {token}"
        
        extracted = handler.extract_token_from_header(header)
        assert extracted == token
    
    def test_extract_token_invalid_header(self, handler):
        """Testa que header inválido levanta exceção."""
        with pytest.raises(InvalidJWTException):
            handler.extract_token_from_header("InvalidHeader")
    
    def test_extract_token_missing_header(self, handler):
        """Testa que header vazio levanta exceção."""
        with pytest.raises(InvalidJWTException):
            handler.extract_token_from_header("")
    
    def test_jwt_handler_singleton(self):
        """Testa que JWTHandler é singleton."""
        handler1 = get_jwt_handler()
        handler2 = get_jwt_handler()
        
        assert handler1 is handler2
