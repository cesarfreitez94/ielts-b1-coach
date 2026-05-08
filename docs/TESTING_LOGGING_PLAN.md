# Testing + Logging Infrastructure Plan

## Overview

Goal: Build a comprehensive test suite and structured logging system to catch bugs before they reach users. Covers unit, integration, E2E tests, and client-side error capture with an admin log viewer.

**Framework:** Vitest (full stack: frontend + backend)
**TypeScript:** strict mode enabled
**E2E:** Playwright (critical flows only)
**Log Viewer:** Admin-only page at `/admin/logs`

---

## Phase 0 — Prerequisites

| # | Task | Details |
|---|------|---------|
| 0.1 | Enable TypeScript strict mode | Set `strict: true` in `frontend/tsconfig.json`, fix type errors |
| 0.2 | Add `typecheck` script | `"typecheck": "tsc --noEmit"` in `frontend/package.json` |
| 0.3 | Install Vitest (backend) | `vitest`, `supertest`, `nock` |
| 0.4 | Install Vitest (frontend) | `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`, `msw` |
| 0.5 | Create test config | `vitest.config.ts` in both packages |
| 0.6 | Add test scripts | `test` and `test:coverage` in both `package.json` |

---

## Phase 1 — Backend Structured Logging

| # | Task | Details |
|---|------|---------|
| 1.1 | Create `backend/src/logger.js` | Pino logger, pretty-print dev / JSON prod, redact auth headers + API keys |
| 1.2 | Create correlation ID middleware | `uuid` middleware assigns `X-Request-ID`, attaches to `req.requestId`, returns in response header |
| 1.3 | Replace Morgan with `pino-http` | Drop morgan, add pino-http middleware with auto-request-logging |
| 1.4 | Migrate all `console.*` to `logger.*` | Systematic replacement across all backend files with proper log levels |
| 1.5 | Add log file rotation | `pino-rotating-file` or Docker log drivers in production |

---

## Phase 2 — Backend Tests

### Services

| # | Task | Details |
|---|------|---------|
| 2.1 | `llmService.test.js` | Mock HTTP (nock) for all 5 LLM providers, API key encrypt/decrypt, error paths |
| 2.2 | `whisperService.test.js` | Audio file handling, timeout, STT provider errors |
| 2.3 | `piperService.test.js` | TTS request/response, error handling |

### Routes

| # | Task | Details |
|---|------|---------|
| 2.4 | `auth.test.js` | Register, login, invalid credentials, duplicate email |
| 2.5 | `config.test.js` | Get/update config, API key encryption, connection test |
| 2.6 | `progress.test.js` | Dashboard aggregation, log-time, complete-task, history, XP triggers |
| 2.7 | `vocabulary.test.js` | SM-2 algorithm, due flashcards, interval/ease update |
| 2.8 | `speaking.test.js` | Transcribe (mock Whisper), evaluate (mock LLM), TTS |
| 2.9 | `writing.test.js` | Submit → evaluate → score parsing, error responses |
| 2.10 | `tutor.test.js` | Chat flow, session listing |
| 2.11 | `gamification.test.js` | All achievement checks, XP awarding, leaderboard |
| 2.12 | `evaluation.test.js` | Run evaluation, latest, history |

### Agents

| # | Task | Details |
|---|------|---------|
| 2.13 | `plannerAgent.test.js` | Task generation, fallback tasks on AI failure |
| 2.14 | `evaluationAgent.test.js` | Score aggregation, B1 projection math, report generation |

---

## Phase 3 — Frontend Tests

### API + Stores

| # | Task | Details |
|---|------|---------|
| 3.1 | `api.test.js` | MSW handlers for all endpoints, auth interceptor, 401 redirect |
| 3.2 | `authStore.test.ts` | Login/logout, localStorage persist, token management |

### Pages

| # | Task | Details |
|---|------|---------|
| 3.3 | `Login.test.tsx` | Form validation, register/login toggle, success redirect |
| 3.4 | `Dashboard.test.tsx` | Loading skeleton, stats cards, progress bar, empty/error states |
| 3.5 | `Speaking.test.tsx` | Record → transcribe → evaluate flow, scores display |
| 3.6 | `Writing.test.tsx` | Prompt select, submit → scores + feedback display |
| 3.7 | `Vocabulary.test.tsx` | Card display, flip, answer buttons, SM-2 quality mapping |
| 3.8 | `Tutor.test.tsx` | Message send, AI response, loading dots, error handling |
| 3.9 | `Settings.test.tsx` | Provider/model selector, API key input, save + toast |
| 3.10 | `Achievements.test.tsx` | Locked/unlocked grid, XP bar, stats counters |

### Components

| # | Task | Details |
|---|------|---------|
| 3.11 | `ErrorBoundary.test.tsx` | Error capture, fallback UI, reload button |
| 3.12 | `ProtectedRoute.test.tsx` | Auth guard, redirect to login |
| 3.13 | `StatsCard.test.tsx`, `ProgressBar.test.tsx`, `LevelBadge.test.tsx`, `RecentAchievements.test.tsx` | Unit tests for reusable components |

---

## Phase 4 — Client Error Logging

| # | Task | Details |
|---|------|---------|
| 4.1 | Create `client_errors` table | In `docker/init.sql`: user_id, page, error_type, message, stack, metadata (JSONB), created_at |
| 4.2 | Create `POST /api/logs/client-error` | Store error payload, return 202 |
| 4.3 | Create `frontend/src/services/logger.ts` | Log levels, buffer-to-localStorage on network failure, flush on reconnect |
| 4.4 | Error boundary integration | `ErrorBoundary.tsx` sends errors to `/api/logs/client-error` |
| 4.5 | API interceptor integration | Axios response interceptor logs all errors with endpoint, status, requestId |

---

## Phase 5 — Admin Log Viewer

| # | Task | Details |
|---|------|---------|
| 5.1 | Create `GET /api/logs` endpoint | Query params: level, source, from, to, limit, offset; reads `client_errors` table |
| 5.2 | Create `AdminLogs.tsx` page | Filterable table: level, source, date range, search; expandable metadata JSON |
| 5.3 | Add route `/admin/logs` | Protected (admin flag or special role required) |
| 5.4 | Add nav entry | Gear icon or admin badge in navbar for authorized users |
| 5.5 | Error telemetry | Redis counters for error types, threshold alert banner on admin page |

---

## Phase 6 — E2E Tests (Playwright)

| # | Task | Details |
|---|------|---------|
| 6.1 | Install Playwright | `npx playwright install`, create `playwright.config.ts` |
| 6.2 | Register + Login + Dashboard | Full flow from registration to dashboard with data |
| 6.3 | Speaking flow | Complete record → transcribe → evaluate flow |
| 6.4 | Writing flow | Complete prompt → write → evaluate flow |
| 6.5 | Settings | Configure provider + API key, test connection |
| 6.6 | Vocabulary + achievements | Complete flashcard → earn achievement notification |

---

## Phase 7 — CI/CD

| # | Task | Details |
|---|------|---------|
| 7.1 | Create `.github/workflows/test.yml` | Backend + frontend tests on push/PR |
| 7.2 | Add PostgreSQL service container | For backend integration tests |
| 7.3 | Add typecheck step | `npm run typecheck` verifies TypeScript |
| 7.4 | Add coverage reporting | Optional: Codecov/Coveralls |

---

## Summary Timeline

| Phase | Effort | Cumulative |
|-------|--------|------------|
| P0 — Prerequisites | 3h | 3h |
| P1 — Backend Logging | 3h | 6h |
| P2 — Backend Tests | 10h | 16h |
| P3 — Frontend Tests | 12h | 28h |
| P4 — Client Error Logging | 4h | 32h |
| P5 — Log Viewer | 4h | 36h |
| P6 — E2E Tests | 8h | 44h |
| P7 — CI/CD | 2h | **46h total** |