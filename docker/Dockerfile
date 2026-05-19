# Dockerfile

# Stage 1: Builder
FROM python:3.11-slim as builder

WORKDIR /app

# Instala dependências de build
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copia requirements e instala
COPY requirements.txt .
RUN pip install --user --no-cache-dir -r requirements.txt

# Stage 2: Runtime
FROM python:3.11-slim

WORKDIR /app

# Instala runtime dependencies (Chromium para PDF)
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium-browser \
    chromium-codecs-ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Cria usuário não-root
RUN useradd -m -u 1000 appuser

# Copia Python packages do builder
COPY --from=builder /root/.local /home/appuser/.local

# Copia código
COPY --chown=appuser:appuser backend/ /app/

# Set PATH
ENV PATH=/home/appuser/.local/bin:$PATH
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

# User
USER appuser

# Port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')" || exit 1

# CMD
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
