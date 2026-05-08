#!/bin/bash
# ============================================================
# IELTS App - Stop Script
# Detiene servicios de la app (NO toca Redis ni PostgreSQL)
# ============================================================

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_ROOT"

RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
NC='\033[0m'

PID_DIR="/tmp"
WHISPER_PID="$PID_DIR/ielts-whisper.pid"
PIPER_PID="$PID_DIR/ielts-piper.pid"
BACKEND_PID="$PID_DIR/ielts-backend.pid"
FRONTEND_PID="$PID_DIR/ielts-frontend.pid"

log() { echo -e "${CYAN}[IELTS]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
success() { echo -e "${GREEN}[OK]${NC} $1"; }

echo ""
log "=== Deteniendo servicios IELTS App ==="
echo ""

# ── 1. Whisper ───────────────────────────────────────────────
log "Deteniendo Whisper..."
if [ -f "$WHISPER_PID" ]; then
    PID=$(cat "$WHISPER_PID")
    if kill -0 "$PID" 2>/dev/null; then
        kill "$PID" 2>/dev/null || true
        sleep 1
        kill -9 "$PID" 2>/dev/null || true
    fi
    rm -f "$WHISPER_PID"
fi
pkill -f "whisper-server" 2>/dev/null || true
success "Whisper detenido"

# ── 2. Piper ─────────────────────────────────────────────────
log "Deteniendo Piper TTS..."
if [ -f "$PIPER_PID" ]; then
    PID=$(cat "$PIPER_PID")
    if kill -0 "$PID" 2>/dev/null; then
        kill "$PID" 2>/dev/null || true
        sleep 1
        kill -9 "$PID" 2>/dev/null || true
    fi
    rm -f "$PIPER_PID"
fi
pkill -f "piper.http_server" 2>/dev/null || true
success "Piper detenido"

# ── 3. Backend ───────────────────────────────────────────────
log "Deteniendo Backend..."
if [ -f "$BACKEND_PID" ]; then
    PID=$(cat "$BACKEND_PID")
    if kill -0 "$PID" 2>/dev/null; then
        kill "$PID" 2>/dev/null || true
        sleep 1
        kill -9 "$PID" 2>/dev/null || true
    fi
    rm -f "$BACKEND_PID"
fi
pkill -f "nodemon" 2>/dev/null || true
pkill -f "node src/index.js" 2>/dev/null || true
pkill -f "next dev" 2>/dev/null || true
success "Backend detenido"

# ── 4. Frontend ─────────────────────────────────────────────
log "Deteniendo Frontend..."
if [ -f "$FRONTEND_PID" ]; then
    PID=$(cat "$FRONTEND_PID")
    if kill -0 "$PID" 2>/dev/null; then
        kill "$PID" 2>/dev/null || true
        sleep 1
        kill -9 "$PID" 2>/dev/null || true
    fi
    rm -f "$FRONTEND_PID"
fi
pkill -f "vite" 2>/dev/null || true
pkill -f "react-scripts" 2>/dev/null || true
success "Frontend detenido"

echo ""
echo "============================================"
success "Servicios de la app detenidos"
log "PostgreSQL y Redis siguen corriendo"
echo "============================================"
echo ""
echo "Para detener PostgreSQL y Redis:"
echo "  sudo systemctl stop postgresql redis"
echo ""
echo "Para iniciar de nuevo:"
echo "  ./run.sh"
echo ""