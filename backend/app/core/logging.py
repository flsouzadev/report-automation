"""
Setup de logging estruturado para Google Cloud Logging.
"""

import logging
import json
from datetime import datetime
from app.core.settings import settings


def setup_logging():
    """Configura logging estruturado."""
    
    # Se em produção no Cloud Run, usar JSON estruturado
    if settings.ENVIRONMENT == "production":
        logging.basicConfig(
            format='%(message)s',
            level=getattr(logging, settings.LOG_LEVEL)
        )
        
        # Substituir handler padrão
        handler = logging.StreamHandler()
        formatter = JsonFormatter()
        handler.setFormatter(formatter)
        
        root_logger = logging.getLogger()
        root_logger.handlers = [handler]
    else:
        # Desenvolvimento: format mais legível
        logging.basicConfig(
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            level=getattr(logging, settings.LOG_LEVEL),
            datefmt='%Y-%m-%d %H:%M:%S'
        )


class JsonFormatter(logging.Formatter):
    """Formatter que converte logs para JSON estruturado."""
    
    def format(self, record: logging.LogRecord) -> str:
        log_data = {
            "timestamp": datetime.utcnow().isoformat(),
            "severity": record.levelname,
            "message": record.getMessage(),
            "logger": record.name,
            "module": record.module,
        }
        
        # Adicionar exception se houver
        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)
        
        # Adicionar campos customizados se existirem
        if hasattr(record, "user"):
            log_data["user"] = record.user
        if hasattr(record, "request_id"):
            log_data["request_id"] = record.request_id
        
        return json.dumps(log_data, default=str)
