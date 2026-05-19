"""
Exceções customizadas.
"""

from fastapi import HTTPException
from typing import Any, Dict


class APIException(HTTPException):
    """Exceção base para a API."""
    
    def __init__(
        self,
        status_code: int = 500,
        detail: str = "Internal Server Error",
        headers: Dict[str, Any] = None,
    ):
        super().__init__(
            status_code=status_code,
            detail=detail,
            headers=headers
        )


class JiraClientException(Exception):
    """Erro ao comunicar com Jira API."""
    pass


class InvalidJWTException(APIException):
    """JWT inválido ou expirado."""
    
    def __init__(self):
        super().__init__(
            status_code=401,
            detail="Invalid or expired JWT token"
        )


class InsufficientPermissions(APIException):
    """Usuário sem permissão."""
    
    def __init__(self, required_scope: str):
        super().__init__(
            status_code=403,
            detail=f"Insufficient permissions. Required: {required_scope}"
        )


class ReportGenerationError(APIException):
    """Erro ao gerar relatório."""
    
    def __init__(self, detail: str):
        super().__init__(
            status_code=500,
            detail=f"Error generating report: {detail}"
        )
