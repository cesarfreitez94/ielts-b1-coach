# IELTS B1 Coach App

Aplicación web para la preparación del examen IELTS nivel B1. Incluye tutor IA, flashcards con repetición espaciada, práctica de speaking/writing, y gamificación para mantener la motivación.

---

## Índice

- [Visión General](#visión-general)
- [Stack Tecnológico](#stack-tecnológico)
- [Arquitectura de Servicios](#arquitectura-de-servicios)
- [Estructura del Proyecto](#estructura-del-proyecto)
- [Quick Start](#quick-start)
- [Instalación de Servicios Locales](#instalación-de-servicios-locales-whisper--piper)
- [Configuración](#configuración)
- [API Endpoints](#api-endpoints)
- [Funcionalidades](#funcionalidades)
- [Despliegue en VPS](#despliegue-en-vps)
- [Variables de Entorno](#variables-de-entorno)

---

## Visión General

El objetivo es guiar al usuario a través de un programa de ~500 horas de estudio para el IELTS, con:

- **Tutor IA** que genera tareas diarias personalizadas
- **Flashcards** con algoritmo SM-2 de repetición espaciada
- **Práctica de Speaking** con reconocimiento de voz y evaluación IA
- **Práctica de Writing** con evaluación IA
- **Gamificación**: XP, logros, niveles (A1 → A2 → B1)
- **Panel de configuración** para que el usuario elija sus proveedores de IA

---

## Stack Tecnológico

| Capa | Tecnología |
|------|------------|
| Frontend | React 18 + Vite 5 + Tailwind 3 |
| Backend | Node.js 20 + Express |
| Base de datos | PostgreSQL 16 |
| Cache | Redis 7 |
| Proxy | Nginx + Let's Encrypt |
| Orquestación | Docker Compose |

**Servicios IA (configurables por el usuario):**

| Servicio | Proveedores |
|----------|-------------|
| LLM Tutor | Kimi (Moonshot), Anthropic, OpenAI, Mistral |
| TTS Audio | Piper TTS (local) |
| Speech-to-Text | Whisper.cpp (local) |

---

## Arquitectura de Servicios

La app usa **servicios locales** para speech (STT/TTS) que no requieren API keys externas:

```
┌─────────────┐     ┌─────────────┐
│  Frontend   │────▶│   Backend   │
│  :3000      │     │   :3001     │
└─────────────┘     └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
       ┌──────────┐  ┌──────────┐  ┌──────────┐
       │ Whisper  │  │  Piper   │  │   LLM    │
       │   STT    │  │   TTS    │  │  (Kimi)  │
       │  :8080   │  │  :5000   │  │  (cloud) │
       └──────────┘  └──────────┘  └──────────┘
```

| Servicio | URL | Descripción |
|----------|-----|-------------|
| Frontend | http://localhost:3000 | React app |
| Backend | http://localhost:3001 | Express API |
| Whisper STT | http://localhost:8080 | Transcripción (Whisper.cpp) |
| Piper TTS | http://localhost:5000 | Síntesis de voz |
| PostgreSQL | localhost:5432 | Base de datos |
| Redis | localhost:6379 | Cache |

---

## Estructura del Proyecto

```
ielts-app/
├── docker/
│   ├── init.sql              # Schema + seed de BD
│   └── nginx.conf            # Proxy reverso + SSL
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│       ├── index.js          # Entry point + cron jobs
│       ├── db/pool.js        # Conexión PostgreSQL
│       ├── middleware/
│       │   └── auth.js       # Middleware JWT
│       ├── services/
│       │   ├── llmService.js # Integración LLM (Kimi)
│       │   ├── sttService.js # Integración Whisper (local)
│       │   └── ttsService.js # Integración Piper (local)
│       ├── agents/
│       │   ├── evaluationAgent.js  # Evalúa progreso cada domingo
│       │   └── plannerAgent.js     # Genera tareas del día con IA
│       └── routes/
│           ├── auth.js       # Login / Register
│           ├── config.js     # Panel de API keys (cifradas)
│           ├── vocabulary.js # Flashcards + SRS SM-2
│           ├── speaking.js   # STT + evaluación IA
│           ├── gamification.js # Logros + XP
│           ├── evaluation.js # Agente evaluador
│           └── progress.js   # Dashboard + tiempo
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│       ├── services/api.js   # Cliente HTTP
│       ├── stores/store.js   # Estado global (Zustand)
│           └── pages/
│               └── Settings.tsx
├── whisper/                  # Whisper.cpp (compilado)
│   ├── whisper-server       # Servidor STT
│   ├── whisper-cli          # CLI tool
│   ├── whisper.cpp-1.8.4/   # Source (se puede eliminar)
│   └── models/
│       └── small.en.bin      # Modelo GGML small English (~466 MB)
├── piper/                    # Piper TTS
│   └── models/
│       └── en_US-lessac-medium.onnx  # Voice model (~61 MB)
├── scripts/
│   └── download-models.sh    # Script de instalación
├── docker-compose.yml
├── .env
├── .env.example
├── INSTALL_SERVICES.md       # Guía de instalación de servicios
├── COMMANDS.md               # Comandos de activación
├── setup-local.sh           # Setup completo sin Docker
└── docs/
    └── DEPLOYMENT.md
```

---

## Quick Start

### Prerrequisitos

- Docker y Docker Compose (para despliegue con contenedor)
- Node.js 20+ (para desarrollo local sin Docker)
- CMake (para compilar Whisper.cpp desde source)
- Python 3.12+ (para Piper TTS)

### Opción A: Con Docker (despliegue completo)

```bash
# 1. Clonar el proyecto
git clone https://github.com/tu-usuario/ielts-app.git
cd ielts-app

# 2. Configurar variables de entorno
cp .env.example .env
nano .env  # Editar con tus valores

# 3. Configurar servicios locales (STT/TTS)
./scripts/download-models.sh

# 4. Levantar con Docker Compose
docker-compose up -d --build

# 5. Arrancar servicios locales
./whisper/whisper-server -m whisper/models/small.en.bin -t 4 --port 8080 &
python3 -m piper.http_server -m piper/models/en_US-lessac-medium.onnx --port 5000 &
```

### Opción B: Sin Docker (desarrollo local)

```bash
bash setup-local.sh
./scripts/download-models.sh

# Arrancar servicios
./whisper/whisper-server -m whisper/models/small.en.bin -t 4 --port 8080 &
python3 -m piper.http_server -m piper/models/en_US-lessac-medium.onnx --port 5000 &

# Arrancar app
cd backend && npm run dev
cd frontend && npm run dev
```

---

## Instalación de Servicios Locales (Whisper + Piper)

### Instalación automática

```bash
./scripts/download-models.sh
```

Esto:
1. Compila Whisper.cpp desde source (v1.8.4)
2. Descarga el modelo `ggml-small.en.bin` (~466 MB)
3. Instala Piper TTS via pip
4. Descarga la voz `en_US-lessac-medium` (~61 MB)

### Instalación manual

**Whisper.cpp:**

```bash
mkdir -p whisper/models
cd whisper
wget -q https://github.com/ggml-org/whisper.cpp/archive/refs/tags/v1.8.4.zip -O whisper.cpp-src.zip
unzip -o whisper.cpp-src.zip
rm whisper.cpp-src.zip
mkdir -p whisper.cpp-1.8.4/build && cd whisper.cpp-1.8.4/build
cmake .. -DCMAKE_BUILD_TYPE=Release
make -j$(nproc)
cd ../..
cp whisper.cpp-1.8.4/build/bin/whisper-server .
cp whisper.cpp-1.8.4/build/bin/whisper-cli .
chmod +x whisper-server whisper-cli

# Modelo
wget -q -O whisper/models/small.en.bin \
  "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.en.bin"
mv whisper/models/ggml-small.en.bin whisper/models/small.en.bin
```

**Piper TTS:**

```bash
pip install piper-tts[http] --break-system-packages
mkdir -p piper/models
python3 -c "from piper.download_voices import download_voice; from pathlib import Path; download_voice('en_US-lessac-medium', Path('./piper/models'))"
```

### Iniciar servicios

```bash
# Whisper STT (puerto 8080)
./whisper/whisper-server -m whisper/models/small.en.bin -t 4 --port 8080

# Piper TTS (puerto 5000)
python3 -m piper.http_server -m piper/models/en_US-lessac-medium.onnx --port 5000
```

### Verificación

**Test Piper TTS:**
```bash
curl -X POST http://localhost:5000/ \
  -H "Content-Type: application/json" \
  -d '{"text":"Hello world"}' -o test.wav
file test.wav  # Debe ser: RIFF (little-endian) data, WAVE audio
```

**Test Whisper STT:**
```bash
curl -X POST http://localhost:8080/inference \
  -F "file=@test.wav"
# Respuesta: {"text":" Hello World!\n"}
```

---

## Configuración

### Variables de entorno obligatorias

```bash
# Base de datos
DB_PASSWORD=contraseña_segura_aquí

# JWT
JWT_SECRET=string_aleatorio_64_chars
# Generar: openssl rand -hex 32

# Cifrado de API keys de usuario (AES-256)
ENCRYPTION_KEY=al_menos_30_caracteres

# URLs
FRONTEND_URL=http://localhost:3000
VITE_API_URL=http://localhost:3001/api

# Servicios locales
WHISPER_URL=http://localhost:8080
PIPER_URL=http://localhost:5000

# API Key de Kimi (LLM Tutor)
KIMI_API_KEY=tu_key_de_kimi

# Entorno
NODE_ENV=production
PORT=3001
```

### Panel de configuración de IA

El usuario accede a `/settings` desde la app y puede configurar:

**LLM Tutor:**
- Proveedor: Kimi (Moonshot) / Anthropic / OpenAI / Mistral / DeepSeek
- Modelo específico
- API Key personal (cifrada AES-256 en BD) — opcional, usa global si está vacía
- Meta diaria de estudio (minutos)

**TTS Audio:**
- Usa Piper TTS local (no requiere API key)

**Speech-to-Text:**
- Usa Whisper.cpp local (no requiere API key)

---

## API Endpoints

### Autenticación

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/auth/register` | Registro de usuario |
| POST | `/api/auth/login` | Login (retorna JWT) |

### Vocabulario

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/vocabulary/decks` | Listar mazos |
| GET | `/api/vocabulary/cards/:deckId` | Listar tarjetas de un mazo |
| POST | `/api/vocabulary/review` | Registrar revisión (algoritmo SM-2) |

### Speaking

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/speaking/evaluate` | Evaluar audio grabado |
| GET | `/api/speaking/prompts` | Obtener prompts de práctica |

### Writing

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/writing/evaluate` | Evaluar texto escrito |

### Gamificación

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/gamification/xp` | Obtener XP y nivel actual |
| GET | `/api/gamification/achievements` | Listar logros |
| POST | `/api/gamification/unlock` | Desbloquear logro (manual) |

### Progreso

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/progress/dashboard` | Dashboard de progreso |
| GET | `/api/progress/stats` | Estadísticas detalladas |

### Configuración

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/config/keys` | Obtener API keys del usuario |
| PUT | `/api/config/keys` | Actualizar API keys |
| POST | `/api/config/test` | Probar configuración de IA |

---

## Funcionalidades

### Flashcards con SM-2

El algoritmo de repetición espaciada SM-2 calcula el próximo repaso según:
- **Dificultad**: La tarjeta se marca como difícil, bien o fácil
- **Intervalo**: Se ajusta dinámicamente (1 día → 7 días → 30 días+)
- **Repasos**: Se registra el historial para estadísticas

| Marca | XP |
|-------|-----|
| Difícil | 2 XP |
| Bien | 5 XP |
| Fácil | 10 XP |

### Tutor IA (Agente Planificador)

Cada día a las 06:00 UTC, el `plannerAgent.js` genera tareas personalizadas basadas en:
- Nivel actual del usuario (A1/A2/B1)
- Progreso en el programa
- Áreas débiles identificadas

### Evaluador Semanal

Cada domingo a las 20:00 UTC, el `evaluationAgent.js` analiza:
- Horas acumuladas vs meta de 500h
- Velocidad de progreso actual
- Predicción de si llegará a tiempo al examen
- Ajuste automático de meta diaria (±30 min)
- Subida/bajada de nivel según scores

### Gamificación

**XP por actividad:**

| Actividad | XP |
|-----------|-----|
| Flashcard difícil | 2 |
| Flashcard bien | 5 |
| Flashcard fácil | 10 |
| Tarea del día | 20-35 |
| Speaking session | score × 5 |
| Writing session | score × 4 |
| Logro desbloqueado | 10-5000 |

**Niveles:**

| Nivel | XP requerido |
|-------|---------------|
| A1 | 0 - 199 XP |
| A2 | 200 - 399 XP |
| B1 | 400+ XP |

**19 logros** desde "Primera tarjeta" hasta "500 horas — Completaste el programa".

---

## Despliegue en VPS

Ver [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md) para la guía completa.

### Resumen

```bash
# 1. Instalar Docker y Docker Compose
curl -fsSL https://get.docker.com | sh
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 2. Subir proyecto al VPS
rsync -avz ./ielts-app/ user@tu-vps:/opt/ielts-app/

# 3. Configurar .env
cp .env.example .env
nano .env

# 4. Instalar servicios locales
./scripts/download-models.sh

# 5. Obtener SSL
sudo certbot certonly --standalone -d tu-dominio.com

# 6. Actualizar nginx.conf con tu dominio
nano docker/nginx.conf

# 7. Levantar
docker-compose up -d --build

# 8. Arrancar servicios locales
./whisper/whisper-server -m whisper/models/small.en.bin -t 4 --port 8080 &
python3 -m piper.http_server -m piper/models/en_US-lessac-medium.onnx --port 5000 &

# 9. Verificar
curl http://localhost/api/health
```

### Actualización

```bash
cd /opt/ielts-app
git pull
./scripts/download-models.sh
docker-compose up -d --build backend frontend
```

### Backup de PostgreSQL

```bash
docker exec ielts_db pg_dump -U ielts_user ielts_b1 > backup_$(date +%Y%m%d).sql
```

---

## Variables de Entorno

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `DB_PASSWORD` | Contraseña PostgreSQL | `mi_password_seguro` |
| `JWT_SECRET` | Clave para tokens JWT (64+ chars) | `openssl rand -hex 32` |
| `ENCRYPTION_KEY` | Clave AES-256 (30+ chars) | `abcdefghijklmnopqrstuvwxyz123456` |
| `FRONTEND_URL` | URL pública del frontend | `https://tu-dominio.com` |
| `VITE_API_URL` | URL pública del backend | `https://tu-dominio.com/api` |
| `NODE_ENV` | Entorno | `production` |
| `PORT` | Puerto del backend | `3001` |
| `KIMI_API_KEY` | API key de Kimi (LLM) | `sk-...` |
| `WHISPER_URL` | URL del servicio Whisper | `http://localhost:8080` |
| `PIPER_URL` | URL del servicio Piper | `http://localhost:5000` |
| `DATABASE_URL` | Auto-construido por docker-compose | — |
| `REDIS_URL` | Auto-construido por docker-compose | — |

---

## Notas de Rendimiento

- **Whisper.cpp (STT):** ~45-90 segundos para transcribir 1 min de audio (modelo small.en en CPU)
- **Piper TTS:** ~3-5x tiempo real (genera 1 segundo de audio en ~0.3 segundos)
- Ambos servicios usan CPU, no requieren GPU
- Los modelos se descargan a `whisper/models/` (~466 MB) y `piper/models/` (~61 MB)

---

## Licencia

MIT