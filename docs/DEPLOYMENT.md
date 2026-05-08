# IELTS B1 Coach App — Guía de Despliegue
## VPS Netcup — Para el desarrollador

---

## Stack completo

| Capa | Tecnología |
|------|-----------|
| Backend | Node.js 20 + Express |
| Base de datos | PostgreSQL 16 |
| Cache | Redis 7 |
| Frontend | React 18 + Vite + Tailwind |
| Proxy | Nginx + Let's Encrypt (SSL) |
| Orquestación | Docker Compose |

---

## Arquitectura de servicios IA (3 separados)

```
┌─────────────────────────────────────────────┐
│               IELTS B1 App                   │
├──────────────┬──────────────┬────────────────┤
│  LLM Tutor   │  TTS Audio   │ Speech-to-Text │
│              │              │                │
│ • Anthropic  │ • OpenAI TTS │ • OpenAI       │
│ • OpenAI     │ • ElevenLabs │   Whisper      │
│ • Mistral    │ • Google TTS │ • AssemblyAI   │
│              │              │ • Deepgram     │
└──────────────┴──────────────┴────────────────┘
       ↓ Keys guardadas cifradas en PostgreSQL
```

---

## Prerrequisitos en el VPS

```bash
# 1. Instalar Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER

# 2. Instalar Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 3. Instalar Certbot (SSL)
sudo apt install certbot -y
```

---

## Despliegue paso a paso

### 1. Subir el proyecto al VPS

```bash
# Desde tu máquina local
rsync -avz ./ielts-app/ user@your-vps-ip:/opt/ielts-app/

# O clonar desde git (recomendado)
git clone https://github.com/tu-usuario/ielts-app.git /opt/ielts-app
cd /opt/ielts-app
```

### 2. Configurar variables de entorno

```bash
cp .env.example .env
nano .env

# Llena:
# DB_PASSWORD=contraseña_segura_aquí
# JWT_SECRET=string_aleatorio_64_chars (genera con: openssl rand -hex 32)
# ENCRYPTION_KEY=exactamente_32_chars!! (para cifrar API keys de usuarios)
# FRONTEND_URL=https://tu-dominio.com
# VITE_API_URL=https://tu-dominio.com/api
```

### 3. SSL con Let's Encrypt

```bash
# Antes de levantar nginx, obtén el certificado
sudo certbot certonly --standalone -d tu-dominio.com

# Actualiza nginx.conf con tu dominio real
nano docker/nginx.conf
# Cambia: server_name yourdomain.com;
# Cambia las rutas del certificado si es necesario
```

### 4. Levantar todo

```bash
cd /opt/ielts-app
docker-compose up -d --build

# Ver logs
docker-compose logs -f backend
docker-compose logs -f postgres
```

### 5. Verificar que todo esté corriendo

```bash
# Health check
curl https://tu-dominio.com/api/health

# Debe responder: {"status":"ok","ts":"..."}

# Ver contenedores activos
docker-compose ps
```

---

## Estructura del proyecto

```
ielts-app/
├── docker-compose.yml
├── .env.example                 ← copiar a .env
├── docker/
│   ├── init.sql                 ← schema + seed de BD
│   └── nginx.conf               ← proxy reverso
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│       ├── index.js             ← entry point + cron jobs
│       ├── db/pool.js           ← conexión PostgreSQL
│       ├── middleware/auth.js   ← JWT middleware
│       ├── services/
│       │   └── llmService.js   ← LLM + TTS + STT (3 servicios)
│       ├── agents/
│       │   ├── evaluationAgent.js  ← evalúa progreso 500h
│       │   └── plannerAgent.js     ← genera tareas del día con IA
│       └── routes/
│           ├── auth.js          ← login / register
│           ├── config.js        ← panel de API keys (cifradas)
│           ├── vocabulary.js    ← flashcards + SRS SM-2
│           ├── speaking.js      ← STT + evaluación IA
│           ├── gamification.js  ← logros + XP
│           ├── evaluation.js    ← agente evaluador
│           └── progress.js      ← dashboard + tiempo
└── frontend/
    ├── Dockerfile
    ├── package.json
    └── src/
        ├── services/api.js      ← cliente HTTP a backend
        ├── stores/store.js      ← estado global (Zustand)
        └── pages/
            └── ConfigPanel.jsx  ← panel de configuración IA
```

---

## Cron Jobs automáticos (ya configurados)

| Horario | Qué hace |
|---------|----------|
| Todos los días 06:00 | Genera tareas personalizadas del día con IA |
| Cada domingo 20:00 | Evaluación completa de progreso + ajuste de nivel |

El evaluador analiza:
- Horas acumuladas vs 500h objetivo
- Velocidad de progreso actual
- Si va a llegar a tiempo al examen
- Ajusta la meta diaria automáticamente (+/- 30 min)
- Sube/baja el nivel (A1→A2→B1) según scores

---

## Panel de configuración (usuario)

El usuario accede desde la app a `/config` y puede configurar:

**Servicio 1 — LLM Tutor:**
- Proveedor: Anthropic / OpenAI / Mistral
- Modelo específico
- API Key (guardada AES-256 cifrada en BD)
- Botón "Probar" que hace una llamada real

**Servicio 2 — TTS Audio:**
- Proveedor: OpenAI / ElevenLabs / Google
- Voz seleccionable
- API Key cifrada
- Botón "Probar" que genera 2 segundos de audio

**Servicio 3 — Speech-to-Text:**
- Proveedor: OpenAI Whisper / AssemblyAI / Deepgram
- API Key cifrada

---

## Sistema de gamificación

**XP por actividad:**
| Actividad | XP |
|-----------|-----|
| Flashcard difícil | 2 XP |
| Flashcard bien | 5 XP |
| Flashcard fácil | 10 XP |
| Tarea del día | 20-35 XP |
| Speaking session | score × 5 XP |
| Writing session | score × 4 XP |
| Logro desbloqueado | 10-5000 XP |

**Niveles:**
| Nivel | XP requerido |
|-------|-------------|
| A1 | 0 - 199 XP |
| A2 | 200 - 399 XP |
| B1 | 400+ XP |

**19 logros** desde "Primera tarjeta" hasta "500 horas — Completaste el programa"

---

## Actualizar la app

```bash
cd /opt/ielts-app
git pull
docker-compose up -d --build backend frontend
```

---

## Backups de PostgreSQL

```bash
# Manual
docker exec ielts_db pg_dump -U ielts_user ielts_b1 > backup_$(date +%Y%m%d).sql

# Automatizar con cron
echo "0 3 * * * docker exec ielts_db pg_dump -U ielts_user ielts_b1 > /opt/backups/ielts_$(date +\%Y\%m\%d).sql" | crontab -
```

---

## Variables de entorno de referencia completa

```
DB_PASSWORD=        # Contraseña PostgreSQL
JWT_SECRET=         # 64+ chars aleatorios
ENCRYPTION_KEY=     # Exactamente 32 chars (para AES-256 de API keys)
FRONTEND_URL=       # https://tu-dominio.com
VITE_API_URL=       # https://tu-dominio.com/api
NODE_ENV=production
PORT=3001
DATABASE_URL=       # Auto-construido por docker-compose
REDIS_URL=          # Auto-construido por docker-compose
```
