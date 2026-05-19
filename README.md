# Upgrade Automação Relatórios - Jira

Modernização de sistema de geração de relatórios Jira de Google Apps Script para Python/FastAPI.

## 📚 Documentação Completa

### Arquitetura & Design
- **[ARQUITETURA.md](ARQUITETURA.md)** - Arquitetura completa, diagramas, fluxos de autenticação, segurança
- **[ROADMAP_MIGRACAO.md](ROADMAP_MIGRACAO.md)** - Roadmap de migração em 18 semanas com quick wins

### Desenvolvimento
- **[docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)** - Setup local, debugging, testes
- **[docs/API.md](docs/API.md)** - Documentação de endpoints
- **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)** - Deploy no Cloud Run

### Operação
- **[docs/MONITORING.md](docs/MONITORING.md)** - Monitoramento, logs, alertas
- **[docs/SECURITY.md](docs/SECURITY.md)** - Boas práticas de segurança
- **[docs/PERFORMANCE.md](docs/PERFORMANCE.md)** - Otimizações e benchmarks

## 🚀 Quick Start

### Prerequisites
- Python 3.11+
- Google Cloud Project
- Jira Cloud instance
- Google Workspace

### Setup Local

```bash
# 1. Clonar repo e ativar venv
git clone <repo>
cd upgrade-automacao-relatorio
source venv/bin/activate  # ou venv\Scripts\activate no Windows

# 2. Instalar dependências
pip install -r requirements.txt

# 3. Configurar variáveis de ambiente
cp .env.example .env
# Editar .env com suas credenciais

# 4. Rodar testes
pytest backend/tests/ -v

# 5. Iniciar servidor dev
cd backend
uvicorn main:app --reload

# Servidor disponível em: http://localhost:8000
# Swagger: http://localhost:8000/docs
```

## 📁 Estrutura do Projeto

```
upgrade-automacao-relatorio/
├── backend/                    # FastAPI backend principal
│   ├── app/                    # Código principal
│   │   ├── api/               # Endpoints
│   │   ├── core/              # Configuração, segurança, logging
│   │   ├── auth/              # Autenticação JWT
│   │   ├── services/          # Lógica de negócio
│   │   ├── clients/           # Clientes HTTP (Jira, etc)
│   │   ├── middleware/        # Middleware (Auth, Errors, etc)
│   │   ├── models/            # Pydantic models
│   │   ├── templates/         # Jinja2 templates
│   │   ├── static/            # CSS, JS, images
│   │   └── utils/             # Utilitários
│   ├── tests/                 # Testes unitários e integração
│   ├── main.py               # Entry point da aplicação
│   └── migrations/           # Alembic migrations (se usar DB)
│
├── apps-script/               # Google Apps Script (thin layer)
│   ├── src/                   # Código do Apps Script
│   │   ├── main.gs           # Entry point
│   │   ├── auth.gs           # JWT generation
│   │   ├── http-client.gs    # HTTP client
│   │   └── sheets-integration.gs
│   ├── appsscript.json       # Configuração
│   └── .clasp.json           # Config clasp
│
├── terraform/                 # Infrastructure as Code
│   ├── main.tf               # Recursos GCP
│   ├── secrets.tf            # Secret Manager
│   ├── cloud-run.tf          # Cloud Run config
│   └── iam.tf                # Roles & permissions
│
├── docker/                    # Dockerfiles
│   ├── Dockerfile
│   └── Dockerfile.dev
│
├── .github/                   # GitHub Actions
│   └── workflows/
│       ├── ci.yml            # Tests, lint, security
│       └── cd.yml            # Deploy to Cloud Run
│
├── scripts/                   # Utilitários
│   ├── setup.sh
│   ├── deploy.sh
│   └── test.sh
│
├── docs/                      # Documentação
│   ├── ARCHITECTURE.md
│   ├── API.md
│   ├── DEPLOYMENT.md
│   ├── SECURITY.md
│   └── diagrams/
│
├── ARQUITETURA.md            # Arquitetura enterprise completa
├── ROADMAP_MIGRACAO.md       # Roadmap de migração
├── requirements.txt          # Dependências Python
├── Dockerfile                # Build image para produção
├── docker-compose.yml        # Local development
├── Makefile                  # Comandos úteis
└── README.md                 # Este arquivo
```

## 🛠️ Tecnologias Principais

```
Backend:
  ✅ FastAPI      - Web framework moderno
  ✅ Python 3.11  - Runtime
  ✅ Pydantic     - Validação de dados
  ✅ Jinja2       - Templates HTML
  ✅ Playwright   - HTML to PDF
  ✅ aioredis     - Cache distribuído
  ✅ Httpx        - HTTP client

Google Cloud:
  ✅ Cloud Run    - Serverless container
  ✅ Secret Mgr   - Gerenciamento de segredos
  ✅ Cloud Storage- Armazenamento de arquivos
  ✅ Cloud Logging- Logs estruturados
  ✅ Cloud Tasks  - Fila de processamento
  ✅ Cloud Monitoring - Métricas

Apps Script:
  ✅ Google Apps Script V8
  ✅ clasp       - Versionamento
  ✅ Google Sheets API
  ✅ Google Drive API

DevOps:
  ✅ Docker      - Containerização
  ✅ Terraform   - Infrastructure as Code
  ✅ GitHub Actions - CI/CD
  ✅ Git         - Versionamento
```

## 🔐 Segurança

- ✅ JWT com RS256 para autenticação
- ✅ Secret Manager para credenciais
- ✅ CORS restritivo
- ✅ Rate limiting
- ✅ Validação de entrada (Pydantic)
- ✅ Logging estruturado
- ✅ Service Accounts com IAM roles

## 📊 Principais Endpoints

### Health & Status
```
GET /health             - Health check
GET /ready              - Readiness check
```

### Reports (Protegidos com JWT)
```
POST /api/v1/reports/generate      - Gerar relatório
GET  /api/v1/reports/{report_id}   - Consultar status
GET  /api/v1/reports/{report_id}/download - Download PDF
```

### AI Insights (Futuro)
```
GET  /api/v1/ai/insights/sprint/{sprint_id}  - Insights de sprint
POST /api/v1/ai/feedback                       - Feedback para ML
```

## 🧪 Testes

```bash
# Rodar todos os testes
pytest backend/tests/ -v

# Testes com cobertura
pytest backend/tests/ --cov=backend --cov-report=html

# Apenas testes unitários
pytest backend/tests/unit/ -v

# Apenas testes de integração
pytest backend/tests/integration/ -v

# Testes específicos
pytest backend/tests/unit/test_jwt_handler.py -v
```

## 📦 Deploy

### Local Development
```bash
docker-compose up
```

### Cloud Run (Produção)
```bash
./scripts/deploy.sh
```

Veja [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) para detalhes.

## 📈 Performance

- **Latência Target:** < 10s (p99)
- **Throughput:** 1000 req/min
- **Cache Hit Rate:** > 70%
- **PDF Size:** < 2MB

Veja [docs/PERFORMANCE.md](docs/PERFORMANCE.md) para benchmarks.

## 🔍 Monitoramento

- **Logs:** Google Cloud Logging (JSON estruturado)
- **Métricas:** Google Cloud Monitoring
- **Alertas:** Slack, email, PagerDuty
- **Dashboard:** Cloud Console

Veja [docs/MONITORING.md](docs/MONITORING.md) para setup.

## 🤝 Contribuindo

1. Crie um branch: `git checkout -b feature/minha-feature`
2. Commit suas mudanças: `git commit -am 'Add feature'`
3. Push: `git push origin feature/minha-feature`
4. Abra um Pull Request

### Code Style
```bash
# Format com black
black backend/

# Lint com flake8
flake8 backend/

# Type checking com mypy
mypy backend/
```

## 📞 Suporte

- **Issues:** GitHub Issues
- **Discussions:** GitHub Discussions
- **Email:** team@company.com
- **Slack:** #automation-reports

## 📄 Licença

Copyright © 2024 CPQD. Todos os direitos reservados.

## 🗺️ Roadmap

Veja [ROADMAP_MIGRACAO.md](ROADMAP_MIGRACAO.md) para o plano de migração detalhado em 18 semanas.

### Fases Principais
- ✅ **Fase 1:** Preparação & Infra (Semanas 1-2)
- ⏳ **Fase 2:** Core Backend (Semanas 3-6)
- ⏳ **Fase 3:** Integração Apps Script (Semanas 7-9)
- ⏳ **Fase 4:** Escalabilidade (Semanas 10-12)
- ⏳ **Fase 5:** IA & Avançado (Semanas 13-16)
- ⏳ **Fase 6:** Estabilidade (Semanas 17-18+)

## 📚 Referências Úteis

- [FastAPI Docs](https://fastapi.tiangolo.com/)
- [Google Cloud Python Libs](https://cloud.google.com/python/docs)
- [Jira Python Lib](https://jira.readthedocs.io/)
- [Playwright Docs](https://playwright.dev/python/)
- [Pydantic Docs](https://docs.pydantic.dev/)

---

**Última atualização:** 19 de maio de 2026  
**Status:** 🔄 Em desenvolvimento  
**Versão:** 0.1.0-alpha
