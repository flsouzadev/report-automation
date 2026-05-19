# Arquitetura Enterprise - Modernização de Apps Script para Python/FastAPI

## 📋 Índice
1. [Visão Geral](#visão-geral)
2. [Arquitetura do Sistema](#arquitetura-do-sistema)
3. [Separação de Responsabilidades](#separação-de-responsabilidades)
4. [Fluxos de Autenticação](#fluxos-de-autenticação)
5. [Segurança e Gerenciamento de Segredos](#segurança-e-gerenciamento-de-segredos)
6. [Integração Apps Script → Backend Python](#integração-apps-script--backend-python)
7. [Estrutura de Pastas](#estrutura-de-pastas)
8. [Deploy no Google Cloud Run](#deploy-no-google-cloud-run)
9. [Geração de PDF Moderna](#geração-de-pdf-moderna)
10. [Otimizações de Performance](#otimizações-de-performance)
11. [Preparação para IA](#preparação-para-ia)
12. [Migração Gradual](#migração-gradual)
13. [Versionamento de Apps Script com clasp](#versionamento-de-apps-script-com-clasp)
14. [Pipeline CI/CD](#pipelinecicd)
15. [Observabilidade e Monitoramento](#observabilidade-e-monitoramento)
16. [Autenticação Inter-Serviços](#autenticação-inter-serviços)

---

## 🏗️ Visão Geral

### Estado Atual (Legacy)
```
Google Apps Script (tudo monolítico)
├── Autenticação Jira (hardcoded?)
├── Consultas Jira (múltiplas)
├── Processamento de dados
├── Manipulação Google Sheets
├── Renderização HTML
├── Geração PDF
└── Gargalo: Tudo na mesma thread/processo
```

### Estado Futuro (Moderno)
```
Google Workspace (UI/Gatilho)
    └─→ Apps Script (Thin Layer)
        └─→ Backend FastAPI (Lógica Pesada)
            ├─→ Jira Client (com cache)
            ├─→ Template Engine (Jinja2)
            ├─→ PDF Generator (Playwright)
            └─→ Cloud Storage (resultados)
```

---

## 🏛️ Arquitetura do Sistema

### Diagrama em Camadas

```
┌─────────────────────────────────────────────────────────────────────┐
│                    GOOGLE WORKSPACE LAYER                           │
├─────────────────────────────────────────────────────────────────────┤
│ Google Sheets  │  Google Drive  │  Gmail  │  Google Calendar       │
└────────────────────────────────────────────────────────────────────┬┘
                                                                      │
                   ┌──────────────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│         APPS SCRIPT LAYER (Thin Interface)                          │
├─────────────────────────────────────────────────────────────────────┤
│ • UI Bindings           • Form Triggers                             │
│ • OAuth2 Google         • Webhook Receivers                         │
│ • JWT Generation        • Simple Data Mapping                       │
└────────────────────────────────────────────────────────────────────┬┘
                           │
                           │ HTTPS + JWT
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│           BACKEND SERVICE (Python FastAPI)                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│ ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│ │ Auth Middleware  │  │ Request Validation│  │ Rate Limiting    │  │
│ └──────────────────┘  └──────────────────┘  └──────────────────┘  │
│                                                                     │
│ ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│ │ Jira Integration │  │ Data Processing  │  │ Report Generation│  │
│ │ (com cache)      │  │ (aggregation)    │  │ (HTML/PDF)       │  │
│ └──────────────────┘  └──────────────────┘  └──────────────────┘  │
│                                                                     │
│ ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│ │ Template Engine  │  │ PDF Generator    │  │ Storage Manager  │  │
│ │ (Jinja2)         │  │ (Playwright)     │  │ (GCS/Drive)      │  │
│ └──────────────────┘  └──────────────────┘  └──────────────────┘  │
│                                                                     │
│ ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐  │
│ │ Logging          │  │ Monitoring       │  │ Cache Manager    │  │
│ └──────────────────┘  └──────────────────┘  └──────────────────┘  │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
         │                    │                    │
         ▼                    ▼                    ▼
    ┌──────────┐         ┌──────────┐        ┌──────────┐
    │   JIRA   │         │ Google   │        │ Cloud    │
    │   API    │         │ Cloud    │        │ Storage  │
    │          │         │ Secret   │        │  (GCS)   │
    │          │         │ Manager  │        │          │
    └──────────┘         └──────────┘        └──────────┘
```

### Componentes Principais

#### 1. **Apps Script (Thin Layer)**
```javascript
// ❌ Responsabilidades que SAEM daqui:
- Autenticação Jira
- Processamento complexo de dados
- Geração de PDF
- Grandes manipulações de Google Sheets

// ✅ Responsabilidades que FICAM aqui:
- Gatilhos (onEdit, onSubmit, timer-driven)
- Interface com usuário
- OAuth2 com Google
- Chamadas HTTP ao backend
- Armazenamento de JWT token
```

#### 2. **Backend FastAPI (Motor Principal)**
```python
# ✅ Responsabilidades AQUI:
- Autentica-se com Jira (credenciais do Secret Manager)
- Consulta e cacheia dados do Jira
- Processa, agrega, transforma dados
- Valida e sanitiza entrada
- Gera HTML via templates
- Converte HTML → PDF
- Armazena resultados em GCS/Drive
- Logs estruturados e métricas
- Rate limiting e throttling
```

#### 3. **Google Cloud (Infraestrutura)**
```
┌─ Google Cloud Run
│  └─ Serviço Python FastAPI (serverless, auto-scaling)
├─ Google Secret Manager
│  ├─ Credenciais Jira
│  ├─ Chave JWT privada
│  └─ Google Drive API key
├─ Cloud Storage (GCS)
│  └─ Relatórios gerados (HTML, PDF)
├─ Cloud Tasks
│  └─ Fila de relatórios para processar assincronamente
├─ Cloud Logging
│  └─ Logs estruturados (JSON)
├─ Cloud Monitoring
│  └─ Métricas e alertas
└─ Cloud Build
   └─ CI/CD automático
```

---

## 🎯 Separação de Responsabilidades

### Matriz de Responsabilidades

| Responsabilidade | Apps Script | FastAPI Backend | Google Cloud |
|------------------|-------------|-----------------|--------------|
| Autenticação Jira | ❌ | ✅ | Secret Mgr |
| Autorização usuário | ✅ | ✅ (validação) | - |
| Consulta Jira | ❌ | ✅ | - |
| Cache de dados | ❌ | ✅ (Redis/Memory) | - |
| Processamento dados | ❌ | ✅ | - |
| Geração HTML | ❌ | ✅ (Jinja2) | - |
| Geração PDF | ❌ | ✅ (Playwright) | - |
| Armazenamento resultados | Apenas ref | ✅ (GCS) | Storage |
| Logs estruturados | ✅ (simples) | ✅ (verbose) | Logging |
| Monitoramento | ❌ | ✅ | Monitoring |
| Escalabilidade | ❌ (limitado) | ✅ (horizontal) | Orquestra |

### Princípios de Design

1. **Single Responsibility Principle (SRP)**
   - Cada módulo tem uma responsabilidade clara
   - Apps Script = gatilho + UI
   - FastAPI = lógica + processamento
   - Google Cloud = infraestrutura

2. **Separation of Concerns**
   - Frontend (Google Sheets) ≠ Backend (FastAPI)
   - Autenticação externa (Jira) isolada do core
   - Geração de relatórios desacoplada da armazenagem

3. **Security by Design**
   - Nenhuma credencial em código
   - JWT com expiração
   - CORS configurado
   - Rate limiting

---

## 🔐 Fluxos de Autenticação

### 1. Fluxo de Autenticação Completo (Login do Usuário)

```
┌─────────────────────────────────────────────────────────┐
│                    Usuário Final                        │
│         (autenticado no Google Workspace)               │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
        ┌────────────────────────────────┐
        │  Apps Script detecta ação      │
        │  (onEdit, botão clicado, etc)  │
        └────────────────────┬───────────┘
                             │
                             ▼
        ┌────────────────────────────────┐
        │  Apps Script:                  │
        │  1. Pega ID do usuário (Google)│
        │  2. Pega Google Access Token   │
        │  3. Valida permissões locais   │
        └────────────────────┬───────────┘
                             │
                             ▼
        ┌────────────────────────────────────────────┐
        │  Apps Script gera JWT                      │
        │  ┌──────────────────────────────────────┐  │
        │  │ Header: {"alg": "RS256", "typ": "JWT"}│ │
        │  │ Payload: {                            │ │
        │  │   "sub": "user@company.com",          │ │
        │  │   "aud": "backend-api",               │ │
        │  │   "iss": "apps-script",               │ │
        │  │   "exp": now + 1h,                    │ │
        │  │   "iat": now,                         │ │
        │  │   "scopes": ["report:generate"]       │ │
        │  │ }                                     │ │
        │  │ Signature: RS256(privateKey)          │ │
        │  └──────────────────────────────────────┘  │
        └────────────────┬───────────────────────────┘
                         │
                         ▼
        ┌─────────────────────────────────────────────┐
        │  POST /api/v1/reports/generate              │
        │  Authorization: Bearer {JWT}                │
        │  Content-Type: application/json             │
        │  {                                          │
        │    "report_type": "sprint_summary",        │
        │    "sprint_id": 42,                        │
        │    "filters": {...}                        │
        │  }                                          │
        └────────────────┬──────────────────────────┘
                         │
                         ▼ HTTPS (TLS 1.3+)
        ┌──────────────────────────────────────────────┐
        │        Backend FastAPI (Cloud Run)           │
        └─────────────────┬──────────────────────────┬─┘
                          │                          │
                 ┌────────▼────────┐      ┌──────────▼──────────┐
                 │ Auth Middleware │      │ JWT Validation      │
                 │ 1. Extrai JWT   │      │ 1. Verifica assin.  │
                 │ 2. Valida algo  │      │ 2. Valida exp.      │
                 │ 3. Valida exp.  │      │ 3. Valida scopes    │
                 └────────┬────────┘      └──────────┬──────────┘
                          │                          │
                 ┌────────▼──────────────────────────▼──────────┐
                 │  Se inválido: retorna 401 Unauthorized       │
                 │  Se válido: continua                         │
                 └────────────────────────────────────────────┘
                          │
                          ▼
        ┌──────────────────────────────────────────────┐
        │    Processa requisição                       │
        │    - Consulta Jira (com credenciais próprias)│
        │    - Processa dados                         │
        │    - Gera relatório                         │
        └────────────────┬──────────────────────────┘
                         │
                         ▼
        ┌──────────────────────────────────────────────┐
        │    Retorna resultado                        │
        │    Status: 200 OK                           │
        │    {                                        │
        │      "report_id": "uuid",                  │
        │      "status": "completed",                │
        │      "pdf_url": "gs://bucket/report.pdf"  │
        │      "generated_at": "2026-05-19T10:30Z"  │
        │    }                                        │
        └────────────────┬──────────────────────────┘
                         │
                         ▼
        ┌──────────────────────────────────────────────┐
        │    Apps Script recebe resposta               │
        │    1. Armazena URL do relatório              │
        │    2. Atualiza Google Sheets com link        │
        │    3. Notifica usuário (sucesso/erro)        │
        └──────────────────────────────────────────────┘
```

### 2. Fluxo de Autenticação Backend-Jira (Service Account)

```
┌──────────────────────────────────────┐
│     Backend FastAPI (Cloud Run)      │
└────────────────┬─────────────────────┘
                 │
                 ▼
        ┌─────────────────────────────┐
        │ Startup do serviço          │
        │ 1. Lê SECRET_JIRA_URL       │
        │ 2. Lê SECRET_JIRA_USER      │
        │ 3. Lê SECRET_JIRA_TOKEN     │
        │    (de Google Secret Mgr)   │
        └─────────────┬───────────────┘
                      │
                      ▼
        ┌───────────────────────────────────┐
        │ Cria cliente Jira autenticado     │
        │ auth = HTTPBasicAuth(             │
        │   username=JIRA_USER,            │
        │   password=JIRA_TOKEN            │
        │ )                                 │
        └──────────────┬────────────────────┘
                       │
                       ▼
        ┌──────────────────────────────────┐
        │ Requisições posteriores a Jira   │
        │ GET /rest/api/3/search           │
        │ Authorization: Basic {base64}    │
        │ (mantém sessão/pool de conexões) │
        └──────────────────────────────────┘
```

### 3. Fluxo de Autenticação Google Drive (Upload de relatórios)

```
┌──────────────────────────────────────┐
│     Backend FastAPI (Cloud Run)      │
└────────────────┬─────────────────────┘
                 │
                 ▼
        ┌──────────────────────────────┐
        │ Startup do serviço           │
        │ Lê SERVICE_ACCOUNT_KEY       │
        │ (arquivo JSON do Secret Mgr) │
        └────────────────┬─────────────┘
                         │
                         ▼
        ┌───────────────────────────────────┐
        │ Cria cliente Google Drive         │
        │ from_service_account_info(        │
        │   SERVICE_ACCOUNT_KEY             │
        │ )                                 │
        └──────────────┬────────────────────┘
                       │
                       ▼
        ┌──────────────────────────────────┐
        │ Upload do relatório               │
        │ drive.files().create(             │
        │   body={...},                     │
        │   media_body=file_stream          │
        │ )                                 │
        └──────────────────────────────────┘
```

---

## 🔒 Segurança e Gerenciamento de Segredos

### 1. Armazenamento de Segredos (Google Secret Manager)

```yaml
# Estrutura de segredos no Secret Manager

secrets/
├── jira-url
│   value: "https://company.atlassian.net"
│   replication: automatic
│
├── jira-username
│   value: "automation@company.com"
│   replication: automatic
│
├── jira-token
│   value: "XXXXXXXXXXXXXXXX"
│   replication: automatic
│   rotation: 90 days
│
├── backend-jwt-private-key
│   value: "-----BEGIN RSA PRIVATE KEY-----\n..."
│   replication: automatic
│
├── backend-jwt-public-key
│   value: "-----BEGIN PUBLIC KEY-----\n..."
│   replication: automatic
│
├── google-service-account
│   value: "{\"type\": \"service_account\", ...}"
│   replication: automatic
│
├── cors-allowed-origins
│   value: "https://docs.google.com|https://sheets.google.com"
│   replication: automatic
│
└── database-connection
    value: "postgresql://user:pass@host:5432/dbname"
    replication: automatic
    rotation: 60 days
```

### 2. Acesso a Segredos (IAM)

```yaml
# Service Account do Cloud Run com permissões

service-account: automation-backend@PROJECT_ID.iam.gserviceaccount.com

roles:
  - roles/secretmanager.secretAccessor
    resources:
      - projects/PROJECT_ID/secrets/jira-*
      - projects/PROJECT_ID/secrets/backend-jwt-*
      - projects/PROJECT_ID/secrets/google-*

  - roles/storage.admin
    resources:
      - projects/PROJECT_ID/buckets/reports-bucket

  - roles/cloudlogging.logWriter
  - roles/cloudmonitoring.metricWriter
  - roles/cloudtrace.agent
```

### 3. Boas Práticas de Segurança

```python
# ❌ NUNCA FAÇA ISSO:
JIRA_TOKEN = "abc123xyz789"  # Hardcoded

# ✅ SEMPRE FAÇA ISSO:
import google.cloud.secretmanager as secretmanager

def get_secret(secret_id: str) -> str:
    """Recupera segredo do Secret Manager com cache."""
    client = secretmanager.SecretManagerServiceClient()
    name = f"projects/{PROJECT_ID}/secrets/{secret_id}/versions/latest"
    response = client.access_secret_version(request={"name": name})
    return response.payload.data.decode("UTF-8")

# Usar:
JIRA_TOKEN = get_secret("jira-token")
```

### 4. Validação de Entrada (Prevenção de Injeção)

```python
from pydantic import BaseModel, validator
from typing import Optional

class ReportRequest(BaseModel):
    """Validação de requisição de relatório."""
    
    report_type: str  # Deve estar em lista branca
    sprint_id: int    # Deve ser número positivo
    filters: Optional[dict] = None
    
    @validator('report_type')
    def validate_report_type(cls, v):
        allowed = ['sprint_summary', 'velocity', 'burn_down', 'risk_analysis']
        if v not in allowed:
            raise ValueError(f'report_type deve ser um de: {allowed}')
        return v
    
    @validator('sprint_id')
    def validate_sprint_id(cls, v):
        if v <= 0:
            raise ValueError('sprint_id deve ser positivo')
        return v
```

### 5. Prevenção de CORS

```python
# main.py
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://docs.google.com",
        "https://sheets.google.com",
    ],  # Nunca use "*"
    allow_credentials=True,
    allow_methods=["GET", "POST"],  # Nunca use "*"
    allow_headers=["Authorization", "Content-Type"],
)
```

---

## 🔗 Integração Apps Script → Backend Python

### 1. Arquivo `appsscript.json` (configuração)

```json
{
  "timeZone": "America/Sao_Paulo",
  "dependencies": {
    "enabledAdvancedServices": [
      {
        "userSymbol": "DriveApp",
        "version": "v3",
        "serviceId": "drive"
      },
      {
        "userSymbol": "SheetsApp",
        "version": "v4",
        "serviceId": "sheets"
      }
    ]
  },
  "exceptionLogging": "CLOUD_LOGGING_ONLY",
  "runtimeVersion": "V8"
}
```

### 2. Apps Script - Cliente HTTP com JWT

```javascript
/**
 * Config para backend
 */
const CONFIG = {
  BACKEND_URL: "https://backend-api.run.app",
  JWT_PRIVATE_KEY: getPrivateKey(),  // Armazenado em Properties
  JWT_ISSUER: "apps-script",
  JWT_AUDIENCE: "backend-api",
  JWT_EXPIRATION_MINUTES: 60
};

/**
 * Gera JWT para autenticação com backend
 */
function generateJWT() {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + (CONFIG.JWT_EXPIRATION_MINUTES * 60);
  
  const header = {
    alg: "RS256",
    typ: "JWT"
  };
  
  const payload = {
    sub: Session.getActiveUser().getEmail(),
    aud: CONFIG.JWT_AUDIENCE,
    iss: CONFIG.JWT_ISSUER,
    exp: exp,
    iat: now,
    scopes: ["report:generate", "report:download"]
  };
  
  // Usa biblioteca externa para assinar
  return Utilities.base64Encode(JSON.stringify(header)) + "." +
         Utilities.base64Encode(JSON.stringify(payload)) + "." +
         signRS256(JSON.stringify(header) + "." + 
                   Utilities.base64Encode(JSON.stringify(payload)),
                   CONFIG.JWT_PRIVATE_KEY);
}

/**
 * Faz requisição ao backend
 */
function callBackend(endpoint, payload) {
  const token = generateJWT();
  
  const options = {
    method: "post",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };
  
  const response = UrlFetchApp.fetch(
    CONFIG.BACKEND_URL + endpoint,
    options
  );
  
  const responseCode = response.getResponseCode();
  if (responseCode === 200) {
    return JSON.parse(response.getContentText());
  } else if (responseCode === 401) {
    throw new Error("Falha na autenticação com backend");
  } else if (responseCode === 429) {
    throw new Error("Rate limit atingido. Aguarde...");
  } else {
    throw new Error(`Erro backend: ${response.getContentText()}`);
  }
}

/**
 * Exemplo: Gerar relatório
 */
function generateReport(sprintId, reportType = "sprint_summary") {
  try {
    const result = callBackend("/api/v1/reports/generate", {
      report_type: reportType,
      sprint_id: sprintId,
      filters: {
        include_blocked: true,
        exclude_subtasks: false
      }
    });
    
    // result = {
    //   report_id: "uuid-xxxx",
    //   status: "completed",
    //   pdf_url: "gs://bucket/report.pdf",
    //   generated_at: "2026-05-19T10:30Z"
    // }
    
    updateSheetWithResult(result);
    return result;
  } catch (error) {
    Logger.log("Erro ao gerar relatório: " + error.toString());
    throw error;
  }
}

/**
 * Exemplo: Gatilho agendado
 */
function onTimerTrigger() {
  const sheet = SpreadsheetApp.getActiveSheet();
  const data = sheet.getDataRange().getValues();
  
  // Processa cada linha que precisa de relatório
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === "pending") {
      const sprintId = data[i][1];
      const result = generateReport(sprintId);
      
      // Atualiza célula com status
      sheet.getRange(i + 1, 3).setValue(result.status);
      sheet.getRange(i + 1, 4).setValue(result.pdf_url);
    }
  }
}

/**
 * Atualiza Google Sheets com resultado
 */
function updateSheetWithResult(result) {
  const sheet = SpreadsheetApp.getActiveSheet();
  const range = sheet.getRange("A1:E10");
  const values = range.getValues();
  
  // Encontra linha vazia e preenche
  for (let i = 0; i < values.length; i++) {
    if (values[i][0] === "") {
      sheet.getRange(i + 1, 1).setValue("completed");
      sheet.getRange(i + 1, 2).setValue(new Date());
      sheet.getRange(i + 1, 3).setValue(result.report_id);
      sheet.getRange(i + 1, 4).setValue(result.pdf_url);
      break;
    }
  }
}
```

### 3. FastAPI - Validação e Processamento

```python
# routes/reports.py
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from datetime import datetime
from typing import Optional
import uuid

from app.auth import verify_jwt
from app.jira_client import JiraClient
from app.report_generator import ReportGenerator
from app.storage import StorageManager

router = APIRouter(prefix="/api/v1/reports", tags=["reports"])

class ReportRequest(BaseModel):
    report_type: str
    sprint_id: int
    filters: Optional[dict] = None

class ReportResponse(BaseModel):
    report_id: str
    status: str
    pdf_url: str
    generated_at: str

@router.post("/generate", response_model=ReportResponse)
async def generate_report(
    request: ReportRequest,
    user: dict = Depends(verify_jwt)
):
    """
    Gera um relatório a partir de dados do Jira.
    
    Fluxo:
    1. Valida JWT do Apps Script
    2. Consulta Jira
    3. Processa dados
    4. Gera HTML via Jinja2
    5. Converte para PDF
    6. Armazena em GCS
    7. Retorna URL assinada
    """
    report_id = str(uuid.uuid4())
    
    try:
        # 1. Consulta Jira
        jira_client = JiraClient()
        sprint_data = jira_client.get_sprint(request.sprint_id)
        issues = jira_client.get_sprint_issues(
            request.sprint_id,
            filters=request.filters
        )
        
        # 2. Processa dados
        processed_data = {
            "sprint": sprint_data,
            "issues": issues,
            "metadata": {
                "generated_by": user["sub"],
                "generated_at": datetime.utcnow().isoformat(),
                "report_type": request.report_type
            }
        }
        
        # 3. Gera HTML
        generator = ReportGenerator()
        html_content = generator.render_template(
            template_name=f"{request.report_type}.html",
            data=processed_data
        )
        
        # 4. Converte para PDF
        pdf_bytes = generator.html_to_pdf(html_content)
        
        # 5. Armazena em GCS
        storage = StorageManager()
        pdf_url = storage.upload_report(
            report_id=report_id,
            pdf_bytes=pdf_bytes,
            metadata={
                "user": user["sub"],
                "sprint_id": request.sprint_id,
                "report_type": request.report_type
            }
        )
        
        # 6. Retorna resposta
        return ReportResponse(
            report_id=report_id,
            status="completed",
            pdf_url=pdf_url,
            generated_at=datetime.utcnow().isoformat()
        )
        
    except Exception as e:
        logger.error(f"Erro ao gerar relatório {report_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Erro ao gerar relatório")
```

---

## 📁 Estrutura de Pastas

### Estrutura Completa do Projeto

```
upgrade-automacao-relatorio/
│
├── .git/                          # Git repository
├── .gitignore                     # Ignora .venv, __pycache__, etc
├── .github/                       # GitHub (workflow, Actions)
│   └── workflows/
│       ├── ci.yml               # Tests, linting, coverage
│       ├── cd.yml               # Deploy to Cloud Run
│       └── security-scan.yml    # SAST, vulnerabilities
│
├── venv/                          # Python virtual environment
├── requirements.txt               # Dependências (pip freeze)
├── requirements-dev.txt           # Dependências de dev (pytest, black, etc)
│
├── docker/                        # Docker configuration
│   ├── Dockerfile               # Build image para produção
│   ├── Dockerfile.dev           # Build image para desenvolvimento
│   └── .dockerignore
│
├── terraform/                     # Infrastructure as Code
│   ├── main.tf                  # Recursos GCP principais
│   ├── variables.tf
│   ├── outputs.tf
│   ├── secrets.tf               # Configuração Secret Manager
│   ├── cloud-run.tf             # Configuração Cloud Run
│   ├── iam.tf                   # Configuração de roles
│   └── terraform.tfvars.example
│
├── apps-script/                   # Código Google Apps Script
│   ├── appsscript.json          # Configuração
│   ├── .clasp.json              # Configuração clasp
│   ├── src/
│   │   ├── main.gs              # Ponto de entrada
│   │   ├── auth.gs              # Autenticação JWT
│   │   ├── http-client.gs       # Cliente HTTP para backend
│   │   ├── sheets-integration.gs # Integração com Google Sheets
│   │   └── utils.gs             # Utilitários
│   └── README.md
│
├── backend/                       # Backend Python/FastAPI
│   ├── main.py                  # Ponto de entrada
│   │
│   ├── app/
│   │   ├── __init__.py
│   │   ├── config.py            # Configuração centralizada
│   │   ├── dependencies.py      # Injeção de dependências
│   │   │
│   │   ├── api/
│   │   │   ├── __init__.py
│   │   │   ├── routes.py        # Rutas principais
│   │   │   ├── v1/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── reports.py   # Endpoints de relatórios
│   │   │   │   ├── health.py    # Health check
│   │   │   │   └── webhooks.py  # Webhooks
│   │   │   └── v2/              # Future API version
│   │   │
│   │   ├── core/
│   │   │   ├── __init__.py
│   │   │   ├── security.py      # JWT, CORS, rate limiting
│   │   │   ├── logging.py       # Logging estruturado
│   │   │   ├── errors.py        # Custom exceptions
│   │   │   └── settings.py      # Environment variables
│   │   │
│   │   ├── auth/
│   │   │   ├── __init__.py
│   │   │   ├── jwt_handler.py   # JWT validation/generation
│   │   │   └── permissions.py   # RBAC/Scopes
│   │   │
│   │   ├── services/            # Lógica de negócio
│   │   │   ├── __init__.py
│   │   │   ├── jira_service.py  # Integração Jira
│   │   │   ├── report_service.py # Orquestração relatórios
│   │   │   ├── template_service.py # Motor de templates
│   │   │   ├── pdf_service.py   # Geração PDF
│   │   │   ├── storage_service.py # GCS/Drive
│   │   │   ├── cache_service.py # Cache
│   │   │   └── ai_service.py    # Integração IA (futuro)
│   │   │
│   │   ├── clients/             # Clientes externos
│   │   │   ├── __init__.py
│   │   │   ├── jira_client.py   # HTTP client para Jira
│   │   │   ├── google_drive_client.py # Google Drive
│   │   │   ├── google_sheets_client.py # Google Sheets
│   │   │   ├── secret_manager_client.py # Secret Manager
│   │   │   └── http_pool.py     # Connection pooling
│   │   │
│   │   ├── models/              # Pydantic models
│   │   │   ├── __init__.py
│   │   │   ├── request.py       # Modelos de request
│   │   │   ├── response.py      # Modelos de response
│   │   │   ├── jira.py          # Modelos de dados Jira
│   │   │   └── domain.py        # Modelos de domínio
│   │   │
│   │   ├── middleware/
│   │   │   ├── __init__.py
│   │   │   ├── auth_middleware.py # Validação JWT
│   │   │   ├── logging_middleware.py # Structured logging
│   │   │   ├── error_middleware.py # Exception handling
│   │   │   └── rate_limit_middleware.py # Rate limiting
│   │   │
│   │   ├── templates/           # Jinja2 templates
│   │   │   ├── base.html        # Template base
│   │   │   ├── layouts/
│   │   │   │   ├── header.html
│   │   │   │   ├── footer.html
│   │   │   │   └── sidebar.html
│   │   │   ├── reports/
│   │   │   │   ├── sprint_summary.html
│   │   │   │   ├── velocity.html
│   │   │   │   ├── burn_down.html
│   │   │   │   ├── risk_analysis.html
│   │   │   │   └── dashboard.html
│   │   │   ├── components/
│   │   │   │   ├── table.html
│   │   │   │   ├── chart.html
│   │   │   │   ├── metric.html
│   │   │   │   └── alert.html
│   │   │   └── emails/
│   │   │       ├── report_ready.html
│   │   │       └── error_notification.html
│   │   │
│   │   ├── static/              # Assets estáticos
│   │   │   ├── css/
│   │   │   │   ├── tailwind.css # TailwindCSS compilado
│   │   │   │   └── custom.css   # Customizações
│   │   │   ├── js/
│   │   │   │   ├── charts.js    # Gráficos
│   │   │   │   └── utils.js     # Utilitários
│   │   │   ├── images/
│   │   │   │   └── company-logo.png
│   │   │   └── fonts/
│   │   │
│   │   └── utils/
│   │       ├── __init__.py
│   │       ├── decorators.py    # @cache, @retry, etc
│   │       ├── validators.py    # Validações customizadas
│   │       ├── formatters.py    # Formatação de dados
│   │       └── helpers.py       # Funções auxiliares
│   │
│   ├── tests/                   # Testes
│   │   ├── __init__.py
│   │   ├── conftest.py          # Fixtures pytest
│   │   ├── unit/
│   │   │   ├── test_jira_client.py
│   │   │   ├── test_report_service.py
│   │   │   ├── test_template_service.py
│   │   │   ├── test_jwt_handler.py
│   │   │   └── test_validators.py
│   │   ├── integration/
│   │   │   ├── test_api_endpoints.py
│   │   │   ├── test_jira_integration.py
│   │   │   ├── test_gcs_integration.py
│   │   │   └── test_pdf_generation.py
│   │   ├── e2e/
│   │   │   ├── test_full_report_flow.py
│   │   │   └── test_auth_flow.py
│   │   └── fixtures/
│   │       ├── jira_responses.py
│   │       ├── mock_data.py
│   │       └── sample_reports.py
│   │
│   └── migrations/              # Alembic migrations (se usar DB)
│       ├── env.py
│       ├── script.py.mako
│       └── versions/
│
├── docs/                          # Documentação
│   ├── ARQUITETURA.md           # Este arquivo
│   ├── API.md                   # Documentação de API
│   ├── DEPLOYMENT.md            # Guia de deploy
│   ├── DEVELOPMENT.md           # Setup desenvolvimento
│   ├── SECURITY.md              # Segurança
│   ├── MONITORING.md            # Monitoramento
│   ├── MIGRATION.md             # Roadmap de migração
│   ├── PERFORMANCE.md           # Otimizações
│   ├── AI_INTEGRATION.md        # Integração IA
│   ├── diagrams/                # Diagramas ASCII
│   │   ├── architecture.txt
│   │   ├── auth_flows.txt
│   │   └── data_flow.txt
│   └── images/                  # Screenshots, diagrams
│
├── scripts/                       # Scripts utilitários
│   ├── setup.sh                 # Setup inicial
│   ├── deploy.sh                # Deploy script
│   ├── test.sh                  # Rodar testes
│   ├── lint.sh                  # Rodar linters
│   ├── migrate-secrets.py       # Migrar segredos
│   ├── init-gcp.sh              # Inicializar GCP
│   └── generate-jwt.py          # Gerar JWT para testes
│
├── .env.example                  # Variáveis de ambiente (exemplo)
├── .dockerignore
├── .gitignore
├── Dockerfile
├── docker-compose.yml           # Docker compose para local
├── Makefile                     # Comandos úteis
├── README.md
├── CHANGELOG.md
│
└── pyproject.toml               # Configuração Python moderno

```

---

## 🚀 Deploy no Google Cloud Run

### 1. Preparação (Terraform + Infra)

```hcl
# terraform/main.tf

terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
  }
  
  backend "gcs" {
    bucket = "your-terraform-state-bucket"
    prefix = "backend"
  }
}

provider "google" {
  project = var.gcp_project_id
  region  = var.gcp_region
}

# Service Account para Cloud Run
resource "google_service_account" "backend" {
  account_id   = "automation-backend"
  display_name = "Backend Automation Service"
}

# Roles para acessar Secret Manager
resource "google_project_iam_member" "backend_secret_accessor" {
  project = var.gcp_project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${google_service_account.backend.email}"
}

# Roles para acessar GCS
resource "google_storage_bucket_iam_member" "backend_gcs" {
  bucket = google_storage_bucket.reports.name
  role   = "roles/storage.objectCreator"
  member = "serviceAccount:${google_service_account.backend.email}"
}

# Cloud Run Service
resource "google_cloud_run_service" "backend" {
  name     = "automation-backend"
  location = var.gcp_region

  template {
    spec {
      service_account_name = google_service_account.backend.email
      
      containers {
        image = "${var.gcp_region}-docker.pkg.dev/${var.gcp_project_id}/backend/api:latest"
        
        env {
          name  = "PROJECT_ID"
          value = var.gcp_project_id
        }
        
        env {
          name  = "ENVIRONMENT"
          value = "production"
        }
        
        resources {
          limits = {
            cpu    = "2"
            memory = "2Gi"
          }
        }
        
        ports {
          container_port = 8000
        }
      }
      
      timeout_seconds = 300
    }
    
    metadata {
      annotations = {
        "autoscaling.knative.dev/maxScale" = "100"
        "autoscaling.knative.dev/minScale" = "1"
      }
    }
  }

  traffic {
    percent         = 100
    latest_revision = true
  }

  depends_on = [
    google_project_iam_member.backend_secret_accessor,
    google_storage_bucket_iam_member.backend_gcs
  ]
}

# Cloud IAM - permite Apps Script chamar Cloud Run
resource "google_cloud_run_service_iam_binding" "public" {
  service = google_cloud_run_service.backend.name
  role    = "roles/run.invoker"
  members = [
    "serviceAccount:${var.apps_script_service_account}"
  ]
}
```

### 2. Dockerfile

```dockerfile
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
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')"

# CMD
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### 3. Deploy Script

```bash
#!/bin/bash
# scripts/deploy.sh

set -e

PROJECT_ID="your-gcp-project"
REGION="us-central1"
SERVICE_NAME="automation-backend"
IMAGE_NAME="${REGION}-docker.pkg.dev/${PROJECT_ID}/backend/api"

# 1. Validar código
echo "Rodando testes..."
pytest backend/tests/ --cov=backend --cov-report=xml

# 2. Fazer build da imagem
echo "Fazendo build da imagem Docker..."
docker build -t ${IMAGE_NAME}:latest .
docker build -t ${IMAGE_NAME}:${GIT_COMMIT:0:7} .

# 3. Push para Container Registry
echo "Fazendo push da imagem..."
docker push ${IMAGE_NAME}:latest
docker push ${IMAGE_NAME}:${GIT_COMMIT:0:7}

# 4. Deploy no Cloud Run
echo "Fazendo deploy no Cloud Run..."
gcloud run deploy ${SERVICE_NAME} \
  --image ${IMAGE_NAME}:latest \
  --region ${REGION} \
  --platform managed \
  --service-account automation-backend@${PROJECT_ID}.iam.gserviceaccount.com \
  --set-env-vars PROJECT_ID=${PROJECT_ID},ENVIRONMENT=production \
  --memory 2Gi \
  --cpu 2 \
  --timeout 300 \
  --max-instances 100 \
  --min-instances 1

echo "Deploy concluído!"
gcloud run services describe ${SERVICE_NAME} --region ${REGION}
```

---

## 📄 Geração de PDF Moderna

### 1. Estratégia com Playwright + Chromium

```python
# backend/app/services/pdf_service.py

from playwright.async_api import async_playwright
from jinja2 import Environment, FileSystemLoader
from pathlib import Path
import asyncio
import logging

logger = logging.getLogger(__name__)

class PDFService:
    """
    Serviço de geração de PDF.
    
    Uso de Playwright vs. alternativas:
    - ✅ Playwright: renderização real de HTML/CSS
    - ❌ ReportLab: apenas para PDFs simples, sem CSS real
    - ❌ WeasyPrint: lento, problemas com renderização complexa
    - ❌ PyPDF: apenas manipulação, sem geração
    """
    
    def __init__(self):
        self.template_dir = Path(__file__).parent.parent / "templates"
        self.jinja_env = Environment(
            loader=FileSystemLoader(self.template_dir)
        )
    
    async def html_to_pdf(
        self,
        html_content: str,
        pdf_format: str = "A4",
        landscape: bool = False,
        margin_mm: int = 10
    ) -> bytes:
        """
        Converte HTML para PDF usando Playwright.
        
        Args:
            html_content: Conteúdo HTML renderizado
            pdf_format: Formato de página (A4, Letter, etc)
            landscape: Orientação
            margin_mm: Margem em milímetros
        
        Returns:
            bytes: Conteúdo PDF
        """
        async with async_playwright() as p:
            # Inicia browser (reutiliza pool em produção)
            browser = await p.chromium.launch(
                args=[
                    "--no-sandbox",
                    "--disable-setuid-sandbox",
                    "--disable-dev-shm-usage"
                ]
            )
            
            try:
                page = await browser.new_page()
                
                # Define HTML
                await page.set_content(html_content, wait_until="networkidle")
                
                # Gera PDF
                pdf_bytes = await page.pdf(
                    format=pdf_format,
                    landscape=landscape,
                    margin={
                        "top": f"{margin_mm}mm",
                        "bottom": f"{margin_mm}mm",
                        "left": f"{margin_mm}mm",
                        "right": f"{margin_mm}mm"
                    },
                    print_background=True
                )
                
                return pdf_bytes
                
            finally:
                await browser.close()
    
    def render_template(
        self,
        template_name: str,
        context: dict
    ) -> str:
        """
        Renderiza template Jinja2.
        
        Args:
            template_name: Nome do template (ex: "reports/sprint_summary.html")
            context: Dados para passar ao template
        
        Returns:
            str: HTML renderizado
        """
        template = self.jinja_env.get_template(template_name)
        return template.render(**context)
    
    async def generate_report_pdf(
        self,
        template_name: str,
        context: dict,
        **pdf_options
    ) -> bytes:
        """
        Fluxo completo: renderiza template e converte para PDF.
        """
        html = self.render_template(template_name, context)
        pdf_bytes = await self.html_to_pdf(html, **pdf_options)
        return pdf_bytes

# Uso:
# service = PDFService()
# pdf = await service.generate_report_pdf(
#     "reports/sprint_summary.html",
#     {"sprint": sprint_data, "issues": issues},
#     pdf_format="A4"
# )
```

### 2. Template Jinja2 com TailwindCSS

```html
<!-- backend/app/templates/reports/sprint_summary.html -->

{% extends "base.html" %}

{% block title %}Relatório Sprint {{ sprint.name }}{% endblock %}

{% block content %}
<div class="space-y-8">
  <!-- Header -->
  <div class="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-8 rounded-lg">
    <h1 class="text-4xl font-bold">{{ sprint.name }}</h1>
    <p class="text-blue-100 mt-2">{{ sprint.state }} • {{ issues|length }} issues</p>
    <div class="grid grid-cols-4 gap-4 mt-6">
      <div>
        <p class="text-blue-200 text-sm">Data Início</p>
        <p class="text-xl font-semibold">{{ sprint.start_date|date('d/m/Y') }}</p>
      </div>
      <div>
        <p class="text-blue-200 text-sm">Data Fim</p>
        <p class="text-xl font-semibold">{{ sprint.end_date|date('d/m/Y') }}</p>
      </div>
      <div>
        <p class="text-blue-200 text-sm">Pontos Planejados</p>
        <p class="text-xl font-semibold">{{ sprint.planned_points }}</p>
      </div>
      <div>
        <p class="text-blue-200 text-sm">Pontos Completados</p>
        <p class="text-xl font-semibold">{{ sprint.completed_points }}</p>
      </div>
    </div>
  </div>

  <!-- Métricas -->
  <div class="grid grid-cols-3 gap-4">
    {% include "components/metric.html" with context title="Velocidade" value=sprint.velocity unit="pts/sprint" color="green" %}
    {% include "components/metric.html" with context title="Conclusão" value=sprint.completion_rate unit="%" color="blue" %}
    {% include "components/metric.html" with context title="Burndown" value=sprint.burndown unit="%" color="orange" %}
  </div>

  <!-- Tabela de Issues -->
  <div class="bg-white rounded-lg shadow-lg overflow-hidden">
    <div class="px-6 py-4 border-b border-gray-200 bg-gray-50">
      <h2 class="text-xl font-semibold text-gray-900">Issues Planejadas</h2>
    </div>
    
    <div class="overflow-x-auto">
      <table class="w-full">
        <thead class="bg-gray-100 border-b border-gray-200">
          <tr>
            <th class="px-6 py-3 text-left text-sm font-semibold text-gray-900">Key</th>
            <th class="px-6 py-3 text-left text-sm font-semibold text-gray-900">Título</th>
            <th class="px-6 py-3 text-center text-sm font-semibold text-gray-900">Pontos</th>
            <th class="px-6 py-3 text-center text-sm font-semibold text-gray-900">Status</th>
            <th class="px-6 py-3 text-center text-sm font-semibold text-gray-900">Assignee</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200">
          {% for issue in issues %}
          <tr class="hover:bg-gray-50">
            <td class="px-6 py-4 text-sm font-medium text-gray-900">{{ issue.key }}</td>
            <td class="px-6 py-4 text-sm text-gray-700">{{ issue.summary }}</td>
            <td class="px-6 py-4 text-sm text-center text-gray-900">
              <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                {{ issue.points }}
              </span>
            </td>
            <td class="px-6 py-4 text-sm text-center">
              {% if issue.status == 'Done' %}
                <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">✓ Done</span>
              {% elif issue.status == 'In Progress' %}
                <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">⟳ In Progress</span>
              {% else %}
                <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">{{ issue.status }}</span>
              {% endif %}
            </td>
            <td class="px-6 py-4 text-sm text-center text-gray-700">
              {% if issue.assignee %}
                <div class="flex items-center justify-center">
                  <img src="{{ issue.assignee.avatar_url }}" alt="{{ issue.assignee.name }}" class="h-6 w-6 rounded-full mr-2">
                  <span>{{ issue.assignee.name }}</span>
                </div>
              {% else %}
                <span class="text-gray-400">Unassigned</span>
              {% endif %}
            </td>
          </tr>
          {% endfor %}
        </tbody>
      </table>
    </div>
  </div>

  <!-- Gráficos (implementar com Chart.js ou similar) -->
  {% include "components/burndown-chart.html" with context %}
  {% include "components/velocity-chart.html" with context %}

  <!-- Footer -->
  <div class="border-t border-gray-200 pt-6 mt-8 text-center text-sm text-gray-600">
    <p>Gerado em {{ metadata.generated_at|date('d/m/Y H:i:s') }} por {{ metadata.generated_by }}</p>
  </div>
</div>

{% endblock %}
```

### 3. Template Base com TailwindCSS

```html
<!-- backend/app/templates/base.html -->

<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{% block title %}Relatório{% endblock %}</title>
    
    <!-- TailwindCSS -->
    <script src="https://cdn.tailwindcss.com"></script>
    
    <!-- Fonts -->
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    
    <!-- Custom styles -->
    <style>
        body {
            font-family: 'Inter', sans-serif;
        }
        
        /* Print styles para PDF */
        @media print {
            body {
                margin: 0;
                padding: 0;
            }
            .no-print {
                display: none;
            }
        }
    </style>
    
    {% block head %}{% endblock %}
</head>
<body class="bg-white text-gray-900">
    <!-- Conteúdo -->
    <div class="max-w-5xl mx-auto p-8">
        {% block content %}{% endblock %}
    </div>
    
    {% block scripts %}{% endblock %}
</body>
</html>
```

---

## ⚡ Otimizações de Performance

### 1. Caching Multi-Camada

```python
# backend/app/services/cache_service.py

from functools import lru_cache, wraps
import aioredis
from datetime import timedelta
import hashlib
import json
from typing import Any, Callable, Optional

class CacheService:
    """
    Estratégia de caching:
    1. In-memory LRU para dados quentes
    2. Redis para cache distribuído
    3. GCS para resultados persistentes
    """
    
    def __init__(self, redis_url: str = None):
        self.redis = None
        self.redis_url = redis_url
        self.local_cache = {}
    
    async def init(self):
        """Inicializa conexão Redis."""
        if self.redis_url:
            self.redis = await aioredis.from_url(self.redis_url)
    
    def _make_key(self, prefix: str, **kwargs) -> str:
        """Gera chave de cache normalizada."""
        # Serializa kwargs de forma determinística
        key_str = json.dumps(kwargs, sort_keys=True)
        hash_suffix = hashlib.md5(key_str.encode()).hexdigest()[:8]
        return f"{prefix}:{hash_suffix}"
    
    async def get(self, key: str) -> Optional[Any]:
        """Tenta recuperar de cache (local → Redis)."""
        # 1. Tenta local
        if key in self.local_cache:
            return self.local_cache[key]
        
        # 2. Tenta Redis
        if self.redis:
            value = await self.redis.get(key)
            if value:
                return json.loads(value)
        
        return None
    
    async def set(
        self,
        key: str,
        value: Any,
        ttl: timedelta = timedelta(hours=1)
    ):
        """Armazena em cache (local + Redis)."""
        serialized = json.dumps(value, default=str)
        
        # Local
        self.local_cache[key] = value
        
        # Redis
        if self.redis:
            await self.redis.setex(
                key,
                ttl,
                serialized
            )
    
    async def cache_decorator(
        self,
        ttl: timedelta = timedelta(hours=1)
    ) -> Callable:
        """Decorator para cachear resultados de funções."""
        def decorator(func: Callable) -> Callable:
            @wraps(func)
            async def wrapper(*args, **kwargs):
                # Gera chave baseada em função + argumentos
                key = self._make_key(func.__name__, *args, **kwargs)
                
                # Tenta recuperar do cache
                cached = await self.get(key)
                if cached is not None:
                    return cached
                
                # Executa função
                result = await func(*args, **kwargs)
                
                # Armazena no cache
                await self.set(key, result, ttl)
                
                return result
            return wrapper
        return decorator

# Uso:
cache = CacheService(redis_url="redis://localhost:6379")

@cache.cache_decorator(ttl=timedelta(hours=1))
async def get_sprint_data(sprint_id: int):
    """Cacheia dados do sprint por 1 hora."""
    return jira_client.get_sprint(sprint_id)
```

### 2. Connection Pooling

```python
# backend/app/clients/http_pool.py

import httpx
from typing import Optional

class HTTPClientPool:
    """
    Pool de conexões HTTP reutilizável.
    
    Reduz overhead de criar nova conexão a cada request.
    Mantém keep-alive, compressão, etc.
    """
    
    _instance: Optional[httpx.AsyncClient] = None
    
    @classmethod
    async def get_client(cls) -> httpx.AsyncClient:
        """Retorna cliente HTTP singleton."""
        if cls._instance is None:
            cls._instance = httpx.AsyncClient(
                # Connection pooling
                limits=httpx.Limits(
                    max_connections=100,
                    max_keepalive_connections=50
                ),
                # Timeouts
                timeout=httpx.Timeout(30.0),
                # Headers padrão
                headers={
                    "User-Agent": "Automation Backend/1.0",
                    "Accept-Encoding": "gzip, deflate"
                }
            )
        return cls._instance
    
    @classmethod
    async def close(cls):
        """Fecha pool ao desligar serviço."""
        if cls._instance:
            await cls._instance.aclose()
            cls._instance = None

# Uso em startup:
# @app.on_event("startup")
# async def startup():
#     await HTTPClientPool.get_client()

# @app.on_event("shutdown")
# async def shutdown():
#     await HTTPClientPool.close()
```

### 3. Processamento Assincro

```python
# backend/app/services/report_service.py

import asyncio
from concurrent.futures import ThreadPoolExecutor
from typing import List

class ReportService:
    """
    Processamento assincro para melhor throughput.
    """
    
    def __init__(self):
        self.executor = ThreadPoolExecutor(max_workers=4)
    
    async def generate_multiple_reports(
        self,
        sprint_ids: List[int]
    ) -> List[dict]:
        """
        Gera múltiplos relatórios em paralelo.
        
        ❌ Ruim (sequencial):
        for sprint_id in sprint_ids:
            result = await generate_report(sprint_id)  # Lento!
        
        ✅ Bom (paralelo):
        tasks = [generate_report(id) for id in sprint_ids]
        results = await asyncio.gather(*tasks)  # Rápido!
        """
        
        tasks = [
            self._generate_report_async(sprint_id)
            for sprint_id in sprint_ids
        ]
        
        # Executa em paralelo
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        return [r for r in results if not isinstance(r, Exception)]
    
    async def _generate_report_async(self, sprint_id: int) -> dict:
        """Gera um relatório assincronamente."""
        # Offload operações I/O para thread pool
        loop = asyncio.get_event_loop()
        
        # Consulta Jira (I/O)
        sprint_data = await loop.run_in_executor(
            self.executor,
            jira_client.get_sprint,
            sprint_id
        )
        
        # Processa dados (CPU)
        processed = await loop.run_in_executor(
            self.executor,
            self._process_sprint_data,
            sprint_data
        )
        
        # Gera PDF (I/O)
        pdf_bytes = await loop.run_in_executor(
            self.executor,
            pdf_service.generate_pdf,
            processed
        )
        
        return {"sprint_id": sprint_id, "pdf": pdf_bytes}
    
    def _process_sprint_data(self, sprint_data: dict) -> dict:
        """Processamento síncrono (pode ser pesado)."""
        # CPU-bound operations aqui
        return {
            "metrics": self._calculate_metrics(sprint_data),
            "trends": self._calculate_trends(sprint_data)
        }
```

### 4. Compressão de Resposta

```python
# main.py

from fastapi.middleware.gzip import GZipMiddleware

app.add_middleware(
    GZipMiddleware,
    minimum_size=1000,  # Comprime respostas > 1KB
    compression_level=6  # Nível 1-9 (9 = máxima compressão, mais lento)
)
```

### 5. Índices no Banco (se usar DB)

```sql
-- Se usar database para cache/histórico

-- Índices para queries frequentes
CREATE INDEX idx_sprints_id ON sprints(id);
CREATE INDEX idx_sprints_state_date ON sprints(state, start_date DESC);
CREATE INDEX idx_issues_sprint_id ON issues(sprint_id);
CREATE INDEX idx_reports_user_created_at ON reports(user_id, created_at DESC);

-- Análise de query plans
EXPLAIN ANALYZE
SELECT * FROM issues WHERE sprint_id = 42;
```

---

## 🤖 Preparação para IA

### 1. Abstrações de Componentes para IA

```python
# backend/app/services/ai_service.py

from abc import ABC, abstractmethod
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class AIInsight(BaseModel):
    """Estrutura padrão para insights de IA."""
    type: str  # "summary", "risk", "recommendation", etc
    content: str
    confidence: float  # 0.0 - 1.0
    generated_at: datetime
    data_source: str  # "jira", "historical", "ai_generated"

class AIService(ABC):
    """
    Interface abstrata para serviço de IA.
    
    Permite trocar implementação sem quebrar resto da app.
    Ex: OpenAI ChatGPT → Claude → Local LLM
    """
    
    @abstractmethod
    async def generate_summary(
        self,
        sprint_data: dict,
        max_tokens: int = 200
    ) -> AIInsight:
        """Gera resumo executivo do sprint."""
        pass
    
    @abstractmethod
    async def analyze_risks(
        self,
        sprint_data: dict,
        historical_data: Optional[dict] = None
    ) -> List[AIInsight]:
        """Analisa riscos baseado em padrões."""
        pass
    
    @abstractmethod
    async def predict_velocity(
        self,
        historical_sprints: List[dict],
        lookback_weeks: int = 8
    ) -> AIInsight:
        """Prediz velocidade futura."""
        pass
    
    @abstractmethod
    async def generate_recommendations(
        self,
        sprint_data: dict,
        team_metrics: dict
    ) -> List[AIInsight]:
        """Gera recomendações de melhoria."""
        pass

# Implementação com OpenAI
class OpenAIService(AIService):
    """Integração com OpenAI ChatGPT."""
    
    def __init__(self, api_key: str, model: str = "gpt-4"):
        self.api_key = api_key
        self.model = model
    
    async def generate_summary(
        self,
        sprint_data: dict,
        max_tokens: int = 200
    ) -> AIInsight:
        """Usa ChatGPT para gerar resumo."""
        import openai
        
        prompt = f"""
        Gere um resumo executivo conciso (máx {max_tokens} tokens) sobre este sprint Jira:
        
        Sprint: {sprint_data['name']}
        Status: {sprint_data['state']}
        Pontos Planejados: {sprint_data['planned_points']}
        Pontos Completados: {sprint_data['completed_points']}
        Issues: {len(sprint_data['issues'])}
        
        Foque em:
        1. Realização de metas
        2. Problemas principais
        3. Recomendações
        """
        
        response = await openai.ChatCompletion.acreate(
            model=self.model,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=max_tokens,
            temperature=0.7
        )
        
        return AIInsight(
            type="summary",
            content=response.choices[0].message.content,
            confidence=0.85,
            generated_at=datetime.utcnow(),
            data_source="openai"
        )
    
    async def analyze_risks(
        self,
        sprint_data: dict,
        historical_data: Optional[dict] = None
    ) -> List[AIInsight]:
        """Análise de riscos com ML."""
        # ... implementação
        pass

# Implementação com Claude (Anthropic)
class ClaudeService(AIService):
    """Integração com Claude (Anthropic)."""
    
    def __init__(self, api_key: str):
        self.api_key = api_key
    
    async def generate_summary(self, sprint_data: dict, max_tokens: int = 200):
        """Usa Claude para análise."""
        # ... implementação
        pass
```

### 2. Endpoints para IA

```python
# backend/app/api/v1/ai_insights.py

from fastapi import APIRouter, Depends
from app.auth import verify_jwt
from app.services.ai_service import AIService

router = APIRouter(prefix="/api/v1/ai", tags=["ai"])

@router.get("/insights/sprint/{sprint_id}")
async def get_sprint_insights(
    sprint_id: int,
    user: dict = Depends(verify_jwt),
    ai_service: AIService = Depends()
):
    """
    Retorna insights de IA sobre um sprint.
    
    Response:
    {
        "summary": {
            "type": "summary",
            "content": "Sprint teve 85% de conclusão. Bloqueadores: API externa.",
            "confidence": 0.92
        },
        "risks": [
            {
                "type": "risk",
                "content": "Velocity caindo. Recomenda-se revisar caps.",
                "confidence": 0.78
            }
        ],
        "recommendations": [
            {
                "type": "recommendation",
                "content": "Aumentar time para 6 pessoas próximo sprint.",
                "confidence": 0.65
            }
        ]
    }
    """
    
    # Busca dados do sprint
    sprint_data = jira_client.get_sprint(sprint_id)
    historical = await get_historical_data(sprint_id)
    
    # Gera insights em paralelo
    summary_task = ai_service.generate_summary(sprint_data)
    risks_task = ai_service.analyze_risks(sprint_data, historical)
    recommendations_task = ai_service.generate_recommendations(sprint_data, historical)
    
    summary, risks, recommendations = await asyncio.gather(
        summary_task, risks_task, recommendations_task
    )
    
    return {
        "sprint_id": sprint_id,
        "summary": summary,
        "risks": risks,
        "recommendations": recommendations,
        "generated_at": datetime.utcnow().isoformat()
    }

@router.post("/feedback")
async def log_ai_feedback(
    feedback: AIFeedback,
    user: dict = Depends(verify_jwt)
):
    """
    Coleta feedback sobre insights para melhorar model.
    """
    await store_feedback(feedback, user["sub"])
    return {"status": "feedback_received"}
```

### 3. Data Pipeline para IA

```python
# backend/app/services/data_pipeline.py

class DataPipelineService:
    """
    Pipeline de dados para treinar/alimentar modelos de IA.
    
    Estratégia:
    1. Coleta dados históricos do Jira
    2. Normaliza e agrega
    3. Calcula features
    4. Fornece para AI service
    5. Coleta feedback
    6. Refina modelos
    """
    
    async def prepare_training_data(
        self,
        weeks_back: int = 24
    ) -> dict:
        """Prepara dataset histórico para treinamento."""
        
        # 1. Busca sprints históricos
        historical_sprints = await jira_client.get_sprints(
            limit=weeks_back // 2  # ~2 semanas por sprint
        )
        
        # 2. Calcula features
        features = {
            "velocity": [],
            "completion_rate": [],
            "issue_distribution": [],
            "team_capacity": [],
            "blockers_count": [],
            "etc": []
        }
        
        for sprint in historical_sprints:
            features["velocity"].append(sprint.completed_points)
            features["completion_rate"].append(
                sprint.completed_points / sprint.planned_points
            )
            # ... mais features
        
        return features
    
    async def calculate_anomalies(
        self,
        current_sprint: dict
    ) -> List[dict]:
        """
        Detecta anomalias comparando com histórico.
        
        Uso de algoritmo simples (Z-score) ou ML (Isolation Forest)
        """
        
        historical = await self.prepare_training_data()
        current_velocity = current_sprint.completed_points
        
        # Calcula média e desvio padrão
        avg_velocity = statistics.mean(historical["velocity"])
        std_velocity = statistics.stdev(historical["velocity"])
        
        # Z-score
        z_score = (current_velocity - avg_velocity) / std_velocity
        
        if abs(z_score) > 2.5:  # Anomalia significativa
            return [{
                "type": "anomaly",
                "metric": "velocity",
                "z_score": z_score,
                "description": f"Velocity {current_velocity} está {abs(z_score):.1f} desvios da média"
            }]
        
        return []
```

---

## 📊 Migração Gradual

### Fases de Migração

```
┌─────────────────────────────────────────────────────────────────────┐
│                      ROADMAP DE MIGRAÇÃO                            │
└─────────────────────────────────────────────────────────────────────┘

FASE 1: PREPARAÇÃO (Semanas 1-2)
├─ ✅ Setup GCP (Secret Manager, Service Accounts)
├─ ✅ Criar repositório Git com clasp
├─ ✅ Configurar CI/CD básico
└─ ✅ Criar estrutura FastAPI skeleton

FASE 2: CORE BACKEND (Semanas 3-6)
├─ ✅ Implementar autenticação JWT
├─ ✅ Integração com Jira (cliente HTTP)
├─ ✅ Cache multi-camada
├─ ✅ Motor de templates Jinja2
├─ ✅ Geração PDF com Playwright
└─ ✅ Deploy Cloud Run básico

FASE 3: INTEGRAÇÃO APPS SCRIPT (Semanas 7-9)
├─ ✅ Implementar client HTTP no Apps Script
├─ ✅ Autenticação JWT no Apps Script
├─ ✅ Testes de integração
├─ ✅ Migração de 1 relatório como piloto
└─ ✅ Treinamento de time

FASE 4: ESCALABILIDADE (Semanas 10-12)
├─ ✅ Connection pooling otimizado
├─ ✅ Redis para cache distribuído
├─ ✅ Cloud Tasks para fila assincro
├─ ✅ Monitoramento e logging
└─ ✅ Testes de carga

FASE 5: IA E AVANÇADO (Semanas 13-16)
├─ ⏳ Integração OpenAI/Claude
├─ ⏳ Data pipeline para ML
├─ ⏳ Anomaly detection
├─ ⏳ Recomendações automáticas
└─ ⏳ Dashboard de insights

FASE 6: ESTABILIDADE (Semanas 17+)
├─ ⏳ SLA monitoring
├─ ⏳ Disaster recovery
├─ ⏳ Backup/restore procedures
└─ ⏳ Suporte 24/7
```

### Quick Wins (Primeiros 2 Meses)

```yaml
Quick Win #1: API Leitura Jira
  Esforço: 1 semana
  Ganho: Reduz múltiplas consultas Apps Script
  
  Implementar:
    ✅ GET /api/v1/jira/sprints
    ✅ GET /api/v1/jira/sprints/{id}/issues
    ✅ Cache de 5 minutos
  
  Impacto:
    - 60% redução de chamadas Jira
    - Melhor taxa de sucesso

Quick Win #2: Geração PDF Básica
  Esforço: 1 semana
  Ganho: PDF real (não imagem) → menor tamanho
  
  Implementar:
    ✅ POST /api/v1/reports/generate-pdf
    ✅ Template simples HTML
    ✅ Playwright renderer
  
  Impacto:
    - Arquivos 70% menores
    - Geração 3x mais rápida
    - Melhor qualidade

Quick Win #3: Segredos no Secret Manager
  Esforço: 2-3 dias
  Ganho: Credenciais fora do código
  
  Implementar:
    ✅ Migração de hardcoded → Secret Manager
    ✅ IAM roles
    ✅ Rotação de tokens
  
  Impacto:
    - 100% mais seguro
    - Compliance
    - Sem modificar App Script ainda

Quick Win #4: Monitoramento Básico
  Esforço: 3-5 dias
  Ganho: Visibilidade de erros
  
  Implementar:
    ✅ Cloud Logging
    ✅ Métricas de erro
    ✅ Alertas simples
  
  Impacto:
    - Detecção rápida de problemas
    - Reduz MTTR
```

### Estratégia de Rollout

```
1. PARALELO (Semanas 1-12)
   Apps Script legado continua 100%
   Backend novo está em staging
   └─ Nenhum risco para produção

2. CANARY (Semanas 13-14)
   1% de requisições → Backend novo
   99% → Apps Script legado
   └─ Monitora bugs antes de escalar

3. BLUE-GREEN (Semanas 15-16)
   50% das requisições → Backend novo
   50% → Apps Script legado
   └─ Fácil rollback se problema

4. FULL MIGRATION (Semana 17+)
   100% → Backend novo
   Apps Script legado ligado mas não ativo
   └─ Pode ser reativado em caso de emergency

5. DECOMMISSION (Semana 18+)
   Remover Apps Script após 30 dias sem problema
   └─ Lições aprendidas documentadas
```

---

## 🔧 Versionamento de Apps Script com clasp

### 1. Setup Inicial

```bash
# Instalar clasp
npm install -g @google/clasp

# Autenticar com Google
clasp login

# Clonar projeto existente
clasp clone 1v3tFCHWLyf0bnpphcJ4y8cWMkKoMriIZAokNXafon1DptJLxw2adFtIN

# Criar novo projeto
clasp create --title "Automation Script v2"

# Criar arquivo .clasp.json
cat > .clasp.json << EOF
{
  "scriptId": "1v3tFCHWLyf0bnpphcJ4y8cWMkKoMriIZAokNXafon1DptJLxw2adFtIN",
  "rootDir": "apps-script/"
}
EOF
```

### 2. Estrutura do Projeto

```
apps-script/
├── .clasp.json
├── appsscript.json
├── src/
│   ├── main.gs
│   ├── auth.gs
│   ├── http-client.gs
│   ├── sheets-integration.gs
│   └── utils.gs
└── dist/              # Build output
    └── Code.gs
```

### 3. Workflow Git

```bash
# Branch de desenvolvimento
git checkout -b feature/new-report-type

# Editar código
vi apps-script/src/main.gs
vi apps-script/src/sheets-integration.gs

# Push para Google Apps Script (dev)
clasp push -f

# Testar no Google Sheets

# Commit
git add apps-script/
git commit -m "feat: add new report type"

# PR para main
git push origin feature/new-report-type

# Merge e versionar
git checkout main
git merge feature/new-report-type
git tag v1.2.0
git push origin main --tags

# Deploy em produção
clasp push -f
```

### 4. Versionamento Semântico

```yaml
# Versões

v1.0.0  # Release inicial
  └─ Features: Report sprint, PDF export
  └─ Estável para produção

v1.1.0  # Novo relatório de velocity
  └─ Feature: Velocity report
  └─ Bugfix: Cache expiration
  
v1.2.0  # Integração com novo backend
  └─ Feature: Chamar backend FastAPI
  └─ Breaking: Descontinua App Script legado
  
v2.0.0  # Thin layer completo
  └─ Major: Remover lógica de processamento
  └─ Major: Remover autenticação Jira
```

---

## 🔄 Pipeline CI/CD

### 1. GitHub Actions Workflow

```yaml
# .github/workflows/ci.yml

name: CI Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      
      - name: Install dependencies
        run: |
          pip install -r requirements-dev.txt
      
      - name: Lint with black
        run: black --check backend/
      
      - name: Type check with mypy
        run: mypy backend/
      
      - name: Run tests
        run: pytest backend/tests/ --cov=backend --cov-report=xml
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
      
      - name: Security scan (bandit)
        run: bandit -r backend/ -ll
  
  security:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Run Trivy vulnerability scanner
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: 'fs'
          scan-ref: '.'
          format: 'sarif'
          output: 'trivy-results.sarif'
      
      - name: Upload to GitHub Security
        uses: github/codeql-action/upload-sarif@v2
        with:
          sarif_file: 'trivy-results.sarif'

# .github/workflows/cd.yml

name: CD Pipeline

on:
  push:
    tags:
      - 'v*'

env:
  GCP_PROJECT_ID: ${{ secrets.GCP_PROJECT_ID }}
  GCP_REGION: us-central1

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Cloud SDK
        uses: google-github-actions/setup-gcloud@v1
        with:
          service_account_key: ${{ secrets.GCP_SA_KEY }}
          project_id: ${{ env.GCP_PROJECT_ID }}
      
      - name: Build Docker image
        run: |
          docker build -t gcr.io/${{ env.GCP_PROJECT_ID }}/backend:${{ github.sha }} .
          docker tag gcr.io/${{ env.GCP_PROJECT_ID }}/backend:${{ github.sha }} gcr.io/${{ env.GCP_PROJECT_ID }}/backend:latest
      
      - name: Push to Container Registry
        run: |
          gcloud auth configure-docker
          docker push gcr.io/${{ env.GCP_PROJECT_ID }}/backend:${{ github.sha }}
          docker push gcr.io/${{ env.GCP_PROJECT_ID }}/backend:latest
      
      - name: Deploy to Cloud Run
        run: |
          gcloud run deploy automation-backend \
            --image gcr.io/${{ env.GCP_PROJECT_ID }}/backend:latest \
            --region ${{ env.GCP_REGION }} \
            --platform managed \
            --set-env-vars PROJECT_ID=${{ env.GCP_PROJECT_ID }} \
            --memory 2Gi \
            --cpu 2
      
      - name: Run smoke tests
        run: |
          SERVICE_URL=$(gcloud run services describe automation-backend --region ${{ env.GCP_REGION }} --format='value(status.url)')
          curl -f $SERVICE_URL/health || exit 1
```

---

## 📊 Observabilidade e Monitoramento

### 1. Logging Estruturado

```python
# backend/app/core/logging.py

import logging
import json
from google.cloud import logging as cloud_logging
from datetime import datetime

class StructuredLogger:
    """
    Logging estruturado para Google Cloud Logging.
    
    Formata logs como JSON para melhor busca/análise.
    """
    
    def __init__(self, name: str):
        self.logger = logging.getLogger(name)
        
        # Cloud Logging handler
        self.cloud_logger = cloud_logging.Client().logger(name)
    
    def log_request(
        self,
        method: str,
        path: str,
        status_code: int,
        duration_ms: float,
        user: str = None
    ):
        """Registra requisição HTTP."""
        self.cloud_logger.log_struct({
            "timestamp": datetime.utcnow().isoformat(),
            "type": "http_request",
            "method": method,
            "path": path,
            "status_code": status_code,
            "duration_ms": duration_ms,
            "user": user,
            "severity": "INFO" if status_code < 400 else "WARNING"
        })
    
    def log_error(
        self,
        error: Exception,
        context: dict = None
    ):
        """Registra erro com stack trace."""
        self.cloud_logger.log_struct({
            "timestamp": datetime.utcnow().isoformat(),
            "type": "error",
            "error": str(error),
            "error_type": type(error).__name__,
            "context": context or {},
            "severity": "ERROR"
        }, severity="ERROR")
    
    def log_jira_call(
        self,
        endpoint: str,
        duration_ms: float,
        status_code: int
    ):
        """Registra chamada à API Jira."""
        self.cloud_logger.log_struct({
            "timestamp": datetime.utcnow().isoformat(),
            "type": "external_api_call",
            "service": "jira",
            "endpoint": endpoint,
            "duration_ms": duration_ms,
            "status_code": status_code
        })
```

### 2. Métricas e Alertas

```python
# backend/app/core/metrics.py

from google.cloud import monitoring_v3
from datetime import datetime

class MetricsCollector:
    """
    Coleta métricas customizadas para Google Cloud Monitoring.
    """
    
    def __init__(self, project_id: str):
        self.project_id = project_id
        self.client = monitoring_v3.MetricServiceClient()
        self.project_name = f"projects/{project_id}"
    
    def record_report_generation_time(
        self,
        duration_ms: float,
        report_type: str
    ):
        """Registra tempo de geração de relatório."""
        
        time_series = monitoring_v3.TimeSeries()
        time_series.metric.type = 'custom.googleapis.com/report/generation_time_ms'
        
        now = monitoring_v3.TimeInterval({
            "end_time": {"seconds": int(datetime.utcnow().timestamp())}
        })
        time_series.interval = now
        
        time_series.resource.type = 'global'
        time_series.resource.labels['project_id'] = self.project_id
        
        point = monitoring_v3.Point({
            "interval": now,
            "value": {"double_value": duration_ms}
        })
        
        time_series.points = [point]
        
        self.client.create_time_series(
            name=self.project_name,
            time_series=[time_series]
        )
    
    def record_jira_api_calls(self, count: int, errors: int):
        """Registra número de chamadas Jira."""
        # Similar ao acima, mas para contadores
        pass
```

### 3. Alerts Automáticos

```yaml
# terraform/monitoring.tf

resource "google_monitoring_alert_policy" "high_error_rate" {
  display_name = "Alta taxa de erro no backend"
  combiner     = "OR"

  conditions {
    display_name = "Taxa de erro > 5%"

    condition_threshold {
      filter  = "resource.type=\"cloud_run_revision\" AND metric.type=\"logging.googleapis.com/user/error_count\""
      comparison_operator = "COMPARISON_GT"
      threshold_value     = 0.05
      duration            = "300s"
    }
  }

  notification_channels = [
    google_monitoring_notification_channel.slack_alerts.name
  ]
}

resource "google_monitoring_alert_policy" "slow_reports" {
  display_name = "Geração de relatório lenta"
  combiner     = "OR"

  conditions {
    display_name = "Tempo > 30s"

    condition_threshold {
      filter  = "resource.type=\"cloud_run_revision\" AND metric.type=\"custom.googleapis.com/report/generation_time_ms\""
      comparison_operator = "COMPARISON_GT"
      threshold_value     = 30000
      duration            = "60s"
    }
  }

  notification_channels = [
    google_monitoring_notification_channel.slack_alerts.name
  ]
}
```

---

## 🔐 Autenticação Inter-Serviços

### Fluxo Completo de Autenticação

```
┌──────────────────────────────────────────────────────────────┐
│            MODELO DE SEGURANÇA COMPLETO                      │
└──────────────────────────────────────────────────────────────┘

1. USUARIO FINAL (Google Workspace)
   │
   ├─ Autenticado via Google OAuth2
   └─ Session token do Google válido

2. APPS SCRIPT (Thin Layer)
   │
   ├─ Acessa dados do usuário (Session.getActiveUser())
   ├─ Gera JWT assimétrico (RS256)
   │  Header: {"alg": "RS256"}
   │  Payload: {
   │    "sub": "user@company.com",
   │    "aud": "backend-api",
   │    "iss": "apps-script",
   │    "exp": now + 1h,
   │    "scopes": ["report:generate"]
   │  }
   │  Signature: SignRS256(privateKey)
   │
   └─ Envia requisição HTTPS com Bearer JWT

3. BACKEND (FastAPI)
   │
   ├─ JWT Middleware intercepta request
   │  ├─ Extrai JWT do header Authorization
   │  ├─ Valida assinatura (usando publicKey)
   │  ├─ Valida expiração
   │  ├─ Valida audience
   │  └─ Se inválido: retorna 401
   │
   ├─ Request Handler processa requisição
   │  ├─ Acessa dados do usuário do JWT payload
   │  └─ Loga ação com identidade do usuário
   │
   └─ Responde com dados processados

4. BACKEND → JIRA (Service Account)
   │
   ├─ Backend autentica como serviço (não como usuário)
   ├─ Usa credenciais Jira (do Secret Manager)
   │  ├─ Username: automation@company.com
   │  └─ Token: [armazenado em Secret Manager]
   │
   └─ Jira não sabe quem é o usuário final

5. BACKEND → GOOGLE CLOUD (Service Account)
   │
   ├─ Backend autentica como serviço
   ├─ Usa chave privada do service account
   │  ├─ Armazenada em Secret Manager
   │  └─ Recuperada apenas quando necessário
   │
   └─ Acessa GCS, Secret Manager, etc
```

### Arquivos de Configuração de Segredos

```yaml
# secrets.yaml (NÃO fazer commit no Git!)

# Para localdev:
LOCAL_DEV:
  JIRA_URL: "http://localhost:8080"
  JIRA_USER: "admin"
  JIRA_TOKEN: "dev-token-local"
  JWT_PRIVATE_KEY: "dev-private-key"
  JWT_PUBLIC_KEY: "dev-public-key"

# Em produção - USAR SECRET MANAGER
PRODUCTION:
  JIRA_URL: "${SECRET_MANAGER:jira-url}"
  JIRA_USER: "${SECRET_MANAGER:jira-username}"
  JIRA_TOKEN: "${SECRET_MANAGER:jira-token}"
  JWT_PRIVATE_KEY: "${SECRET_MANAGER:backend-jwt-private-key}"
  JWT_PUBLIC_KEY: "${SECRET_MANAGER:backend-jwt-public-key}"
```

---

## 🎯 Resumo Executivo - Arquitetura Final Recomendada

### Princípios Fundamentais

```
┌─────────────────────────────────────────────────────────────┐
│  ARQUITETURA ENTERPRISE PARA RELATÓRIOS JIRA               │
└─────────────────────────────────────────────────────────────┘

1. SEPARAÇÃO DE CONCERNS
   ✅ Frontend (Google Sheets) = interface apenas
   ✅ Middleware (Apps Script) = orquestração leve
   ✅ Backend (FastAPI) = lógica + processamento
   ✅ Cloud = infraestrutura

2. SEGURANÇA BY DESIGN
   ✅ Nenhuma credencial em código
   ✅ JWT com expiração curta
   ✅ Service Accounts para APIs externas
   ✅ CORS restritivo
   ✅ Rate limiting
   ✅ Logging estruturado

3. ESCALABILIDADE
   ✅ Cloud Run = auto-scaling
   ✅ Connection pooling = reuso
   ✅ Caching multi-camada = reduz carga
   ✅ Async/await = melhor concorrência

4. PERFORMANCE
   ✅ Cache agressivo = 60% redução de latência
   ✅ PDF moderno = 70% redução de tamanho
   ✅ Paralelo = 3x mais rápido
   ✅ Compressão = reduz bandwidth

5. PREPARADO PARA IA
   ✅ Abstrações de serviço
   ✅ Data pipeline
   ✅ Endpoints de insights
   ✅ Feedback loop
```

### Comparação: Apps Script vs Arquitetura Nova

| Aspecto | Apps Script | Arquitetura Nova |
|---------|-------------|-----------------|
| **Velocidade** | 30s+ | 5-10s |
| **Segurança** | Média | Alta |
| **Escalabilidade** | Baixa | Alta |
| **Manutenção** | Difícil | Fácil |
| **Testabilidade** | Baixa | Alta |
| **Observabilidade** | Nenhuma | Excelente |
| **Custo** | Variável | Previsível |
| **IA-Ready** | Não | Sim |

---

Próximas páginas: Implementação de cada componente, exemplos de código, e detalhes técnicos específicos.
