# =========================================================
# Stage 1 - Builder
# =========================================================
FROM python:3.12-slim AS builder

WORKDIR /app

# Environment
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Dependências de build
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Upgrade pip
RUN pip install --upgrade pip setuptools wheel

# Instala dependências Python
COPY requirements.txt .

RUN pip install --user --no-cache-dir -r requirements.txt


# =========================================================
# Stage 2 - Runtime
# =========================================================
FROM python:3.12-slim

WORKDIR /app

# Environment
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PATH="/home/appuser/.local/bin:$PATH"

# =========================================================
# Dependências Chromium / Playwright
# =========================================================
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    chromium-common \
    fonts-liberation \
    fonts-dejavu \
    fonts-noto \
    fonts-noto-cjk \
    libnss3 \
    libatk-bridge2.0-0 \
    libxkbcommon0 \
    libgtk-3-0 \
    libgbm1 \
    libasound2 \
    libxshmfence1 \
    libglu1 \
    ca-certificates \
    wget \
    curl \
    && rm -rf /var/lib/apt/lists/*

# =========================================================
# Usuário não-root
# =========================================================
RUN useradd -m -u 1000 appuser

# =========================================================
# Copia dependências Python
# =========================================================
COPY --from=builder /root/.local /home/appuser/.local

# =========================================================
# Copia aplicação
# =========================================================
COPY --chown=appuser:appuser backend/ /app/

# =========================================================
# User
# =========================================================
USER appuser

# =========================================================
# Expose
# =========================================================
EXPOSE 8000

# =========================================================
# Healthcheck
# =========================================================
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')" || exit 1

# =========================================================
# Run
# =========================================================
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]