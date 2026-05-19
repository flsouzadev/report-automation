"""
Configuração pytest.
"""

import pytest
from fastapi.testclient import TestClient
from app.core.settings import Settings


@pytest.fixture
def settings():
    """Override settings para testes."""
    return Settings(
        ENVIRONMENT="testing",
        DEBUG=True,
        JWT_SECRET_KEY="test-secret-key"
    )


@pytest.fixture
def client():
    """Cliente HTTP para testes."""
    from main import app
    return TestClient(app)
