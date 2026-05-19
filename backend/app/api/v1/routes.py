"""
Rotas de API v1.
"""

from fastapi import APIRouter

router = APIRouter()


@router.get("/status")
async def api_status():
    """Status da API v1."""
    return {"version": "1.0.0", "status": "operational"}
