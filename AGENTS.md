# AGENTS.md — IELTS B1 Coach App

## Dev Commands

```bash
# Full local setup (Redis, PostgreSQL, .env, npm deps, Whisper+Piper models)
bash setup-local.sh

# Start everything (Redis, PostgreSQL, Whisper, Piper, backend, frontend)
./run.sh

# Backend only (port 3001)
cd backend && npm run dev

# Frontend only (port 3000)
cd frontend && npm run dev
```

## Service URLs

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:3001/api |
| Whisper STT | http://localhost:8080 |
| Piper TTS | http://localhost:5000 |
| PostgreSQL | localhost:5432 |
| Redis | localhost:6379 |

## Architecture

- **Monorepo**: `backend/` (Express) and `frontend/` (React+Vite) are separate packages
- **Entry point**: `backend/src/index.js` — Express server + cron jobs (no separate app.js)
- **Cron jobs**: `plannerAgent.js` runs daily at 06:00 UTC; `evaluationAgent.js` runs Sundays at 20:00 UTC
- **Local ML**: Whisper.cpp (STT) and Piper TTS run as standalone HTTP servers — NOT in Docker
- **API keys**: User-provided keys are AES-256 encrypted in PostgreSQL (table: `app_config`)
- **Config**: `.env` lives at repo root AND is copied to `backend/.env` by setup-local.sh

## Key Files

- `run.sh` — orchestrator that starts all 6 services sequentially with health checks
- `setup-local.sh` — one-shot setup: Redis, PostgreSQL schema, .env files, npm deps, Whisper+Piper
- `docker/init.sql` — full PostgreSQL schema + seed data (vocabulary, achievements)
- `scripts/download-models.sh` — compiles Whisper.cpp from source v1.8.4 + downloads GGML model + Piper voice
- `frontend/src/pages/Settings.tsx` — user-facing config page for LLM provider and API keys

## User Settings

- Users configure LLM provider and personal API keys via the **Settings** page at `/settings`
- The Settings link appears in the navbar (gear icon)
- If no personal API key is set, the system falls back to global keys from `.env` (KIMI_API_KEY)

## Quirks

- Whisper transcription is slow: ~45–90s for 1 min of audio on CPU
- `.env` must have `ENCRYPTION_KEY` at least 30 characters (AES-256)
- `frontend/.env` only needs `VITE_API_URL`; backend reads root `.env`
- `docker-compose.yml` does NOT start Whisper/Piper — those are separate manual processes
- Database user: `ielts_user`, DB: `ielts_b1`, default password in setup: `ielts123`

## Testing & Logging Plan

See `docs/TESTING_LOGGING_PLAN.md` for the full implementation roadmap.

**Framework:** Vitest (full stack) | **E2E:** Playwright (critical flows) | **Logging:** Pino (structured)
**TypeScript:** strict mode | **Log viewer:** `/admin/logs` (admin-only)

### Phase Summary

| Phase | Focus | Effort |
|-------|-------|--------|
| P0 | Prerequisites (Vitest, TypeScript strict) | 3h |
| P1 | Backend structured logging (Pino + correlation IDs) | 3h |
| P2 | Backend unit + integration tests | 10h |
| P3 | Frontend component + page tests | 12h |
| P4 | Client-side error capture + storage | 4h |
| P5 | Admin log viewer page | 4h |
| P6 | Playwright E2E (critical flows) | 8h |
| P7 | GitHub Actions CI/CD | 2h |

## Verify Services

```bash
# Piper TTS
curl -X POST http://localhost:5000/ -H "Content-Type: application/json" -d '{"text":"Hello"}' -o test.wav

# Whisper STT
curl -X POST http://localhost:8080/inference -F "file=@test.wav"
```