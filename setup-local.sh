#!/bin/bash
# ============================================================
# IELTS APP - Setup Local (sin Docker)
# Ejecutar: bash setup-local.sh
# ============================================================

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_ROOT"

echo "============================================"
echo " IELTS B1 App - Setup Local"
echo "============================================"

# ============================================================
# 1. INSTALAR Y ARRANCAR REDIS
# ============================================================
echo ""
echo "[1/9] Instalando Redis..."
if ! command -v redis-server &> /dev/null; then
    sudo apt-get update -qq
    sudo apt-get install -y redis-server
fi

if ! systemctl is-active --quiet redis; then
    sudo systemctl start redis
    sudo systemctl enable redis
fi

if redis-cli ping &>/dev/null; then
    echo "  ✅ Redis OK"
else
    echo "  ⚠️  Redis no responde, intentando arrancar manualmente..."
    sudo redis-server --daemonize yes
    sleep 1
    redis-cli ping && echo "  ✅ Redis OK (arrancado manualmente)" || echo "  ❌ Redis falló"
fi

# ============================================================
# 2. CONFIGURAR POSTGRESQL
# ============================================================
echo ""
echo "[2/9] Configurando PostgreSQL..."

PG_USER="ielts_user"
PG_DB="ielts_b1"
PG_PASS="ielts123"

# Crear usuario si no existe
if ! sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='$PG_USER'" | grep -q 1; then
    sudo -u postgres psql -c "CREATE USER $PG_USER WITH PASSWORD '$PG_PASS';"
    echo "  ✅ Usuario '$PG_USER' creado"
else
    echo "  ℹ️  Usuario '$PG_USER' ya existe"
fi

# Crear DB si no existe
if ! sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='$PG_DB'" | grep -q 1; then
    sudo -u postgres psql -c "CREATE DATABASE $PG_DB OWNER $PG_USER;"
    sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $PG_DB TO $PG_USER;"
    echo "  ✅ Base de datos '$PG_DB' creada"
else
    echo "  ℹ️  Base de datos '$PG_DB' ya existe"
fi

# ============================================================
# 3. CARGAR SCHEMA
# ============================================================
echo ""
echo "[3/9] Cargando schema en PostgreSQL..."
SCHEMA_FILE="$PROJECT_ROOT/docker/init.sql"
if [ -f "$SCHEMA_FILE" ]; then
    PGPASSWORD="$PG_PASS" psql -h localhost -U "$PG_USER" -d "$PG_DB" -f "$SCHEMA_FILE" > /dev/null 2>&1
    echo "  ✅ Schema cargado (o ya estaba cargado)"
else
    echo "  ❌ No se encontró $SCHEMA_FILE"
    exit 1
fi

# ============================================================
# 4. GENERAR SECRETOS
# ============================================================
echo ""
echo "[4/9] Generando secretos..."

JWT_SECRET=$(openssl rand -hex 32)
ENCRYPTION_KEY="abcdefghijklmnopqrstuvwxyz123456"

# ============================================================
# 5. CREAR .env EN RAÍZ
# ============================================================
echo ""
echo "[5/9] Creando .env en raíz del proyecto..."

cat > "$PROJECT_ROOT/.env" << EOF
# Database
DB_PASSWORD=$PG_PASS
DATABASE_URL=postgresql://$PG_USER:$PG_PASS@localhost:5432/$PG_DB

# Security
JWT_SECRET=$JWT_SECRET
ENCRYPTION_KEY=$ENCRYPTION_KEY

# URLs
FRONTEND_URL=http://localhost:3000
VITE_API_URL=http://localhost:3001/api

# Local Services (Whisper + Piper)
WHISPER_URL=http://localhost:8080
PIPER_URL=http://localhost:5000

# Environment
NODE_ENV=development
PORT=3001
EOF

echo "  ✅ .env creado en $PROJECT_ROOT/.env"

# ============================================================
# 6. COPIAR .env A BACKEND
# ============================================================
echo ""
echo "[6/9] Copiando .env a backend/..."

cp "$PROJECT_ROOT/.env" "$PROJECT_ROOT/backend/.env"
echo "  ✅ .env copiado a $PROJECT_ROOT/backend/.env"

# ============================================================
# 7. CREAR .env EN FRONTEND
# ============================================================
echo ""
echo "[7/9] Creando .env en frontend/..."

cat > "$PROJECT_ROOT/frontend/.env" << EOF
VITE_API_URL=http://localhost:3001/api
EOF

echo "  ✅ .env creado en $PROJECT_ROOT/frontend/.env"

# ============================================================
# 8. INSTALAR DEPENDENCIAS
# ============================================================
echo ""
echo "[8/9] Instalando dependencias npm..."

echo "  Instalando backend..."
cd "$PROJECT_ROOT/backend" && npm install --silent

echo "  Instalando frontend..."
cd "$PROJECT_ROOT/frontend" && npm install --silent

# ============================================================
# 9. INSTALAR SERVICIOS LOCALES (Whisper + Piper)
# ============================================================
echo ""
echo "[9/9] Instalando servicios locales (Whisper + Piper)..."
if [ -f "$PROJECT_ROOT/scripts/download-models.sh" ]; then
    bash "$PROJECT_ROOT/scripts/download-models.sh"
else
    echo "  ⚠️  Script download-models.sh no encontrado, omitiendo servicios locales"
fi

echo ""
echo "============================================"
echo " ✅ Setup completado!"
echo "============================================"
echo ""
echo "Para arrancar:"
echo "  Backend:  cd backend && npm run dev"
echo "  Frontend: cd frontend && npm run dev"
echo ""
echo "Para arrancar servicios locales:"
echo "  Whisper: ./whisper/whisper-server -m whisper/models/small.en.bin -t 4 --port 8080 &"
echo "  Piper:   python3 -m piper.http_server -m piper/models/en_US-lessac-medium.onnx --port 5000 &"
echo ""
echo "Endpoints:"
echo "  API:        http://localhost:3001/api/health"
echo "  Frontend:   http://localhost:3000"
echo "  Whisper:    http://localhost:8080"
echo "  Piper TTS:  http://localhost:5000"
echo ""