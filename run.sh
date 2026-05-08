#!/bin/bash
# ============================================================
# IELTS App - Run Script
# Inicia todos los servicios secuencialmente con verificación
# ============================================================

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_ROOT"

# ── Colores para output ─────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# ── PID files ───────────────────────────────────────────────
PID_DIR="/tmp"
WHISPER_PID="$PID_DIR/ielts-whisper.pid"
PIPER_PID="$PID_DIR/ielts-piper.pid"
BACKEND_PID="$PID_DIR/ielts-backend.pid"
FRONTEND_PID="$PID_DIR/ielts-frontend.pid"

# ── Funciones de ayuda ─────────────────────────────────────
log() {
    echo -e "${CYAN}[IELTS]${NC} $1"
}

success() {
    echo -e "${GREEN}[OK]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

wait_for_service() {
    local url=$1
    local name=$2
    local max_attempts=${3:-10}
    local wait_seconds=${4:-2}

    log "Esperando $name en $url..."

    for i in $(seq 1 $max_attempts); do
        if curl -sf "$url" > /dev/null 2>&1; then
            success "$name está listo"
            return 0
        fi
        sleep $wait_seconds
    done

    error "$name no respondió después de $((max_attempts * wait_seconds))s"
    return 1
}

# ── Cleanup al salir ─────────────────────────────────────────
cleanup() {
    echo ""
    log "Deteniendo servicios..."
    bash "$PROJECT_ROOT/stop.sh" 2>/dev/null || true
    exit 0
}

trap cleanup SIGINT SIGTERM

# ── 1. Redis ─────────────────────────────────────────────────
log "=== [1/6] Redis ==="

if systemctl is-active --quiet redis 2>/dev/null; then
    success "Redis está corriendo"
else
    warn "Redis no está activo, intentando arrancar..."
    if command -v redis-server &> /dev/null; then
        sudo systemctl start redis 2>/dev/null || sudo redis-server --daemonize yes 2>/dev/null
        sleep 2
    fi
fi

if redis-cli ping > /dev/null 2>&1; then
    success "Redis OK (redis-cli ping)"
else
    error "Redis no está disponible. Ejecuta: sudo systemctl start redis"
    exit 1
fi

# ── 2. PostgreSQL ────────────────────────────────────────────
log ""
log "=== [2/6] PostgreSQL ==="

if systemctl is-active --quiet postgresql 2>/dev/null; then
    success "PostgreSQL está corriendo"
else
    warn "PostgreSQL no está activo, intentando arrancar..."
    if command -v pg_ctl &> /dev/null; then
        sudo systemctl start postgresql 2>/dev/null || true
        sleep 3
    fi
fi

PG_USER="ielts_user"
PG_DB="ielts_b1"

if PGPASSWORD=ielts123 psql -h localhost -U "$PG_USER" -d "$PG_DB" -c "SELECT 1" > /dev/null 2>&1; then
    success "PostgreSQL OK ($PG_DB)"
else
    error "PostgreSQL no está disponible. Ejecuta: sudo systemctl start postgresql"
    exit 1
fi

# ── 3. Whisper ───────────────────────────────────────────────
log ""
log "=== [3/6] Whisper.cpp (STT) ==="

# Verificar si ya está corriendo
if curl -sf http://localhost:8080/ > /dev/null 2>&1; then
    success "Whisper ya está corriendo en puerto 8080"
else
    # Limpiar PID anterior si existe
    [ -f "$WHISPER_PID" ] && rm -f "$WHISPER_PID"

    log "Iniciando Whisper..."

    # Crear directorio de logs
    mkdir -p "$PROJECT_ROOT/logs"

    nohup "$PROJECT_ROOT/whisper/whisper-server" \
        -m "$PROJECT_ROOT/whisper/models/small.en.bin" \
        -t 4 \
        --port 8080 \
        > "$PROJECT_ROOT/logs/whisper.log" 2>&1 &
    echo $! > "$WHISPER_PID"

    sleep 3

    if wait_for_service "http://localhost:8080/" "Whisper" 15 2; then
        success "Whisper arrancado (PID: $(cat $WHISPER_PID))"
    else
        error "Whisper falló al arrancar. Revisa logs/whisper.log"
        exit 1
    fi
fi

# ── 4. Piper TTS ─────────────────────────────────────────────
log ""
log "=== [4/6] Piper TTS ==="

if curl -sf -X POST http://localhost:5000/ -H "Content-Type: application/json" -d '{"text":"test"}' > /dev/null 2>&1; then
    success "Piper ya está corriendo en puerto 5000"
else
    [ -f "$PIPER_PID" ] && rm -f "$PIPER_PID"

    log "Iniciando Piper TTS..."

    nohup python3 -m piper.http_server \
        -m "$PROJECT_ROOT/piper/models/en_US-lessac-medium.onnx" \
        --port 5000 \
        > "$PROJECT_ROOT/logs/piper.log" 2>&1 &
    echo $! > "$PIPER_PID"

    sleep 3

    if curl -sf -X POST http://localhost:5000/ -H "Content-Type: application/json" -d '{"text":"test"}' > /dev/null 2>&1; then
        success "Piper arrancado (PID: $(cat $PIPER_PID))"
    else
        error "Piper falló al arrancar. Revisa logs/piper.log"
        exit 1
    fi
fi

# ── 5. Backend (FOREGROUND) ──────────────────────────────────
log ""
log "=== [5/6] Backend ==="

# Verificar si ya está corriendo
if curl -sf http://localhost:3001/api/health > /dev/null 2>&1; then
    success "Backend ya está corriendo en puerto 3001"
else
    [ -f "$BACKEND_PID" ] && rm -f "$BACKEND_PID"

    log "Iniciando Backend (logs en consola)..."
    log "Presiona Ctrl+C para detener todos los servicios"

    echo ""

    cd "$PROJECT_ROOT/backend"
    npm run dev &
    echo $! > "$BACKEND_PID"

    if wait_for_service "http://localhost:3001/api/health" "Backend" 20 2; then
        success "Backend arrancado (PID: $(cat $BACKEND_PID))"
    else
        error "Backend falló al arrancar"
        exit 1
    fi
fi

# ── 6. Frontend (FOREGROUND) ─────────────────────────────────
log ""
log "=== [6/6] Frontend ==="

if curl -sf http://localhost:3000/ > /dev/null 2>&1; then
    success "Frontend ya está corriendo en puerto 3000"
else
    [ -f "$FRONTEND_PID" ] && rm -f "$FRONTEND_PID"

    log "Iniciando Frontend (logs en consola)..."

    echo ""

    cd "$PROJECT_ROOT/frontend"
    npm run dev &
    echo $! > "$FRONTEND_PID"

    sleep 5

    if wait_for_service "http://localhost:3000/" "Frontend" 20 3; then
        success "Frontend arrancado (PID: $(cat $FRONTEND_PID))"
    else
        error "Frontend falló al arrancar"
        exit 1
    fi
fi

# ── Listo ───────────────────────────────────────────────────
echo ""
echo "============================================"
echo -e "${GREEN}✅ PLATFORM READY${NC}"
echo "============================================"
echo ""
echo "  Frontend:   http://localhost:3000"
echo "  Backend:    http://localhost:3001"
echo "  Whisper:    http://localhost:8080"
echo "  Piper TTS:  http://localhost:5000"
echo ""
echo "  PostgreSQL: localhost:5432 ( corriendo)"
echo "  Redis:      localhost:6379 ( corriendo)"
echo ""
echo "Presiona Ctrl+C para detener todos los servicios"
echo "============================================"

# Esperar a que terminen los procesos en foreground (backend + frontend)
wait