# Makefile - Comandos úteis

.PHONY: help setup install test lint format run docker-up docker-down clean

help:
	@echo "📚 Comandos disponíveis:"
	@echo ""
	@echo "Setup & Ambiente:"
	@echo "  make setup           - Setup inicial do projeto"
	@echo "  make install         - Instalar dependências"
	@echo ""
	@echo "Qualidade de Código:"
	@echo "  make lint            - Rodar linters (flake8, pylint)"
	@echo "  make format          - Formatar código (black, isort)"
	@echo "  make type-check      - Type checking (mypy)"
	@echo ""
	@echo "Testes:"
	@echo "  make test            - Rodar todos os testes"
	@echo "  make test-unit       - Testes unitários"
	@echo "  make test-integration- Testes de integração"
	@echo "  make coverage        - Coverage report"
	@echo ""
	@echo "Executar:"
	@echo "  make run             - Rodar servidor dev (localhost:8000)"
	@echo "  make docker-up       - Subir containers (Docker Compose)"
	@echo "  make docker-down     - Descer containers"
	@echo ""
	@echo "Limpeza:"
	@echo "  make clean           - Remover cache e temp files"
	@echo ""

setup:
	python -m venv venv
	source venv/bin/activate && pip install --upgrade pip
	source venv/bin/activate && pip install -r requirements.txt
	cp .env.example .env
	@echo "✅ Setup completo!"

install:
	source venv/bin/activate && pip install -r requirements.txt

test:
	source venv/bin/activate && pytest backend/tests/ -v --tb=short

test-unit:
	source venv/bin/activate && pytest backend/tests/unit/ -v

test-integration:
	source venv/bin/activate && pytest backend/tests/integration/ -v

coverage:
	source venv/bin/activate && pytest backend/tests/ --cov=backend --cov-report=html --cov-report=term

lint:
	source venv/bin/activate && flake8 backend/ --count --show-source --statistics
	source venv/bin/activate && pylint backend/ --exit-zero

format:
	source venv/bin/activate && black backend/
	source venv/bin/activate && isort backend/

type-check:
	source venv/bin/activate && mypy backend/ --ignore-missing-imports

run:
	source venv/bin/activate && cd backend && uvicorn main:app --reload --host 0.0.0.0 --port 8000

docker-up:
	docker-compose up -d

docker-down:
	docker-compose down

clean:
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name "*.pyc" -delete
	find . -type d -name ".pytest_cache" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name ".mypy_cache" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name ".coverage" -delete
	find . -type d -name "htmlcov" -exec rm -rf {} + 2>/dev/null || true
	@echo "✅ Limpeza concluída!"
