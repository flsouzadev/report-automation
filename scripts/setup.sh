#!/bin/bash
# scripts/setup.sh - Setup inicial do projeto

set -e

echo "🚀 Setup Upgrade Automação Relatórios"
echo "======================================"
echo ""

# 1. Verificar Python
echo "1️⃣  Verificando Python..."
python_version=$(python --version 2>&1)
echo "   ✅ $python_version"

# 2. Criar venv
if [ ! -d "venv" ]; then
    echo "2️⃣  Criando virtual environment..."
    python -m venv venv
    echo "   ✅ venv criado"
else
    echo "2️⃣  venv já existe"
fi

# 3. Ativar venv
echo "3️⃣  Ativando venv..."
source venv/bin/activate
echo "   ✅ venv ativado"

# 4. Instalar dependências
echo "4️⃣  Instalando dependências..."
pip install --upgrade pip > /dev/null 2>&1
pip install -r requirements.txt > /dev/null 2>&1
echo "   ✅ Dependências instaladas"

# 5. Criar .env
if [ ! -f ".env" ]; then
    echo "5️⃣  Criando arquivo .env..."
    cp .env.example .env
    echo "   ✅ .env criado (edite com suas credenciais)"
else
    echo "5️⃣  .env já existe"
fi

# 6. Criar pastas essenciais
echo "6️⃣  Verificando estrutura de diretórios..."
mkdir -p backend/app/templates backend/app/static
echo "   ✅ Estrutura OK"

# 7. Verificar imports
echo "7️⃣  Testando imports..."
python -c "import fastapi, pydantic, jinja2, playwright" && echo "   ✅ Imports OK" || echo "   ❌ Erro nos imports"

echo ""
echo "✅ Setup concluído!"
echo ""
echo "Próximos passos:"
echo "  1. Editar .env com credenciais"
echo "  2. Rodar: source venv/bin/activate"
echo "  3. Rodar: cd backend && uvicorn main:app --reload"
echo "  4. Acessar: http://localhost:8000/docs"
echo ""
