"""
Teste de exemplo para API health check.
"""

import pytest
from fastapi.testclient import TestClient


def test_health_endpoint(client):
    """Testa endpoint /health."""
    response = client.get("/health")
    
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "version" in data


def test_ready_endpoint(client):
    """Testa endpoint /ready."""
    response = client.get("/ready")
    
    assert response.status_code == 200
    data = response.json()
    assert data["ready"] is True
