"""
Modelos Pydantic para requisições e respostas.
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class HealthResponse(BaseModel):
    """Resposta do health check."""
    status: str = Field(..., description="Status da aplicação")
    environment: str = Field(..., description="Ambiente (dev/prod)")
    version: str = Field(..., description="Versão da API")


class ReportRequest(BaseModel):
    """Requisição de geração de relatório."""
    report_type: str = Field(..., description="Tipo de relatório (sprint_summary, velocity, etc)")
    sprint_id: int = Field(..., description="ID do sprint no Jira")
    filters: Optional[dict] = Field(None, description="Filtros adicionais")
    
    class Config:
        example = {
            "report_type": "sprint_summary",
            "sprint_id": 42,
            "filters": {
                "include_blocked": True,
                "exclude_subtasks": False
            }
        }


class ReportResponse(BaseModel):
    """Resposta de geração de relatório."""
    report_id: str = Field(..., description="ID único do relatório")
    status: str = Field(..., description="Status (completed, in_progress, failed)")
    pdf_url: Optional[str] = Field(None, description="URL do PDF gerado")
    generated_at: str = Field(..., description="Timestamp de geração")
    
    class Config:
        example = {
            "report_id": "550e8400-e29b-41d4-a716-446655440000",
            "status": "completed",
            "pdf_url": "gs://bucket/reports/550e8400.pdf",
            "generated_at": "2024-01-01T10:30:00Z"
        }


class ErrorResponse(BaseModel):
    """Resposta de erro."""
    detail: str = Field(..., description="Descrição do erro")
    request_id: Optional[str] = Field(None, description="ID da requisição para tracking")
