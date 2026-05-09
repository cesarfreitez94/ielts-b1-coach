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

# Tests
npm test                             # Backend unit tests (Vitest)
cd frontend && npm test              # Frontend tests
npm run test:e2e                     # E2E tests (Playwright, from root)
cd frontend && npm run typecheck    # TypeScript strict check
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
| Admin Log Viewer | http://localhost:3000/admin/logs |

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
- `backend/src/logger.js` — Pino structured logger with auth/API key redaction
- `backend/src/middleware/requestId.js` — Correlation ID middleware (X-Request-ID)
- `backend/src/routes/logs.js` — Client error capture + log viewer API endpoints
- `frontend/src/services/logger.ts` — Client-side error logger (buffer-to-localStorage)
- `frontend/src/pages/AdminLogs.tsx` — Admin error telemetry page at `/admin/logs`

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

**Framework:** Vitest (full stack) | **E2E:** Playwright (critical flows)
**Logging:** Pino (structured) | **TypeScript:** strict mode
**Log viewer:** `/admin/logs` (admin-only) | **CI/CD:** `.github/workflows/test.yml`

### Phase Summary

| Phase | Focus | Status |
|-------|-------|--------|
| P0 | ✅ Prerequisites (Vitest, TypeScript strict) | Done |
| P1 | ✅ Backend structured logging (Pino + correlation IDs) | Done |
| P2 | ✅ Backend unit + integration tests | Done |
| P3 | ✅ Frontend component + page tests | Done |
| P4 | ✅ Client-side error capture + storage | Done |
| P5 | ✅ Admin log viewer page | Done |
| P6 | ✅ Playwright E2E (critical flows) | Done |
| P7 | ✅ GitHub Actions CI/CD | Done |

**Test counts:** 14 backend test files (~48 tests) | 13 frontend test files | 5 E2E specs

## OpenSpec SDD+TDD Workflow

### Commands
- `/opsx-propose` — Create new change proposal
- `/opsx-explore` — Investigate ideas without implementing
- `/opsx-apply` — Start implementing tasks from a change
- `/opsx-archive` — Archive completed change

### Workflow
1. `npx -y @fission-ai/openspec@latest new change <name>` — Create change
2. `/opsx-propose "description"` — Generate proposal/design/tasks
3. Review and approve artifacts
4. `/opsx-apply` — Execute TDD cycle per task
5. `/opsx-archive` — Finalize when done

### Feature Structure (Backend)
```
backend/src/features/<feature>/
├── SPEC.md                    # GHERKIN scenarios
├── <feature>Service.test.js   # Tests FIRST (RED)
├── <feature>Service.js        # Implementation (GREEN)
└── index.js                   # Single export
```

### OpenSpec Artifacts
- `openspec/specs/` — Living specs (captured requirements)
- `openspec/changes/` — Change proposals with proposal.md, design.md, tasks.md

## Verify Services

```bash
# Piper TTS
curl -X POST http://localhost:5000/ -H "Content-Type: application/json" -d '{"text":"Hello"}' -o test.wav

# Whisper STT
curl -X POST http://localhost:8080/inference -F "file=@test.wav"
```