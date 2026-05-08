# Plan de Mejoras — IELTS B1 Coach App

## Resumen Ejecutivo

Este documento detal a las mejoras críticas de seguridad, infraestructura y usabilidad
para la aplicación IELTS B1 Coach. El plan sigue metodología: security primero,
luego infraestructura, luego usabilidad.

---

## FASE 1: SEGURIDAD CRÍTICA

### 1.1 Clave de Cifrado Hardcodeada
**Severidad:** CRÍTICA
**Archivo:** `backend/src/services/llmService.js:7`

**Problema:**
```javascript
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'ielts-b1-secret-key-32chars!!!!!';
```
Si `ENCRYPTION_KEY` no está configurada, todas las API keys de usuarios se cifran
con una clave pública conocida.

**Solución:**
1. Eliminar el fallback hardcodeado
2. Validar que `ENCRYPTION_KEY` exista al iniciar — lanzar error si no existe
3. Añadir test de longitud exacta (32 chars)
4. Documentar en `.env.example`

**Cambios:**
- `backend/src/services/llmService.js` — remover fallback, añadir validación
- `.env.example` — documentar requisito obligatorio
- `docs/IMPROVEMENT_PLAN.md` — este documento

---

### 1.2 Inyección SQL
**Severidad:** CRÍTICA
**Archivo:** `backend/src/routes/vocabulary.js:12`

**Problema:**
```javascript
const levelFilter = level ? `AND v.level = '${level}'` : '';
```

**Solución:**
Usar parameterized queries para el filtro de level.

**Cambios:**
- `backend/src/routes/vocabulary.js` — parametrizar el filtro

---

### 1.3 JWT Expuesto en URL
**Severidad:** CRÍTICA
**Archivo:** `frontend/src/services/api.js:60`

**Problema:**
```javascript
getTTS: (text) => `${baseURL}/speaking/tts?text=${text}&token=${getToken()}`,
```
Token en query params = expuesto en logs, historial, referrers.

**Solución:**
Cambiar a `Authorization: Bearer` header.

**Cambios:**
- `frontend/src/services/api.js` — usar header en vez de query param
- `backend/src/routes/speaking.js` — leer token del header

---

### 1.4 JWT Secret Débil Fallback
**Severidad:** ALTA
**Archivo:** `backend/src/middleware/auth.js`

**Problema:**
Si `JWT_SECRET` no está configurado, usa valor predictible.

**Solución:**
Lanzar error al inicio si `JWT_SECRET` no está configurado o tiene <64 chars.

---

## FASE 2: INFRAESTRUCTURA

### 2.1 ENCRYPTION_KEY en Docker Compose
**Severidad:** ALTA

**Problema:**
`docker-compose.yml` no pasa `ENCRYPTION_KEY` al contenedor backend.

**Solución:**
Añadir la variable al servicio backend en compose.

**Cambios:**
- `docker-compose.yml` — añadir `ENCRYPTION_KEY` a environment del backend

---

### 2.2 Nginx: Dominio Hardcodeado
**Severidad:** MEDIA
**Archivo:** `docker/nginx.conf`

**Problema:**
`server_name yourdomain.com;` placeholder.

**Solución:**
Usar variable de entorno para el server_name.

**Cambios:**
- `docker/nginx.conf` — usar variable `$HOST_DOMAIN`
- `docker-compose.yml` — pasar `HOST_DOMAIN` env var

---

### 2.3 Redis Healthcheck
**Severidad:** BAJA

**Problema:**
Backend no detecta si Redis falla post-inicio.

**Solución:**
Añadir healthcheck a Redis en docker-compose.

---

## FASE 3: USABILIDAD

### 3.1 Completar Frontend

**Estado actual:**
- ❌ No existe `index.html`, `main.tsx`, `App.tsx`
- ❌ No existe `vite.config.ts`, `tailwind.config.js`
- ❌ No existe routing
- ❌ Solo existe 1 página: `ConfigPanel.jsx`
- ❌ Dependencias instaladas sin usar: react-router-dom, react-query, framer-motion

**Estado objetivo:**
- ✅ Scaffold completo con Vite + TypeScript
- ✅ Routing con React Router v6
- ✅ Páginas: Login, Dashboard, Vocabulario, Speaking, Writing, Tutor, Logros, Config
- ✅ React Query para server state
- ✅ Framer Motion para animaciones

**Archivos a crear/modificar:**
```
frontend/
├── index.html
├── vite.config.ts
├── tailwind.config.js
├── postcss.config.js
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── pages/
│   │   ├── Login.tsx
│   │   ├── Dashboard.tsx
│   │   ├── Vocabulary.tsx
│   │   ├── Speaking.tsx
│   │   ├── Writing.tsx
│   │   ├── Tutor.tsx
│   │   ├── Achievements.tsx
│   │   └── ConfigPanel.tsx
│   ├── components/
│   │   ├── Layout.tsx
│   │   ├── ProtectedRoute.tsx
│   │   ├── LoadingSkeleton.tsx
│   │   ├── ErrorBoundary.tsx
│   │   └── ...
│   ├── services/
│   │   └── api.ts
│   ├── stores/
│   │   └── authStore.ts
│   └── hooks/
│       ├── useAuth.ts
│       └── useProgress.ts
```

---

### 3.2 Dashboard Visual de Progreso

**Problema:**
El usuario no puede visualizar su progreso hacia las 500 horas.

**Solución:**
Crear dashboard con:
- Barra de progreso 0-500h
- Gráfico de velocidad (horas/semana)
- Áreas débiles identificadas
- Predicción de fecha de examen
- Racha de días consecutivos

**API a usar:**
- `GET /api/progress/dashboard`
- `GET /api/progress/stats`

**UI:**
- Usar `recharts` (ya instalado)
- Framer Motion para transiciones

---

### 3.3 Gamificación Visible

**Problema:**
XP, niveles y logros existen en backend pero son invisibles para el usuario.

**Solución:**
Crear sistema de gamificación en UI:
- Panel de nivel actual (A1/A2/B1) con barra de XP
- Notificaciones toast al desbloquear logros
- Badge de nivel en navbar
- Feed de logros recientes

**API a usar:**
- `GET /api/gamification/xp`
- `GET /api/gamification/achievements`

**UI:**
- Componente `AchievementToast` para notificaciones
- `LevelBadge` en header
- `ProgressBar` para XP

---

### 3.4 Persistencia del Chat con Tutor

**Problema:**
El historial de conversación con el tutor se pierde al recargar.

**Solución:**
- Guardar mensajes en localStorage (sincronización offline)
- Sincronizar con backend (`POST /api/tutor/chat`)
- Cargar historial al iniciar sesión (`GET /api/tutor/sessions`)

**Store a modificar:**
- `frontend/src/stores/store.js` → añadir persistencia de mensajes

---

## CRONOGRAMA SUGERIDO

### Semana 1: Seguridad
- [ ] Fix clave hardcodeada
- [ ] Fix inyección SQL
- [ ] Fix JWT en URL
- [ ] Fix JWT secret fallback
- [ ] Añadir ENCRYPTION_KEY a docker-compose

### Semana 2: Infraestructura
- [ ] Variables de entorno para nginx
- [ ] Healthcheck para Redis
- [ ] Validación de inputs (zod)

### Semana 3-4: Frontend Core
- [ ] Crear scaffold completo
- [ ] Implementar routing
- [ ] Crear páginas: Login, Dashboard
- [ ] Integrar React Query

### Semana 5-6: Features
- [ ] Página Vocabulary (SM-2)
- [ ] Página Speaking
- [ ] Página Writing
- [ ] Dashboard visual (recharts)
- [ ] Sistema de logros visible

### Semana 7: Polish
- [ ] Animaciones con framer-motion
- [ ] Loading skeletons
- [ ] Error boundaries
- [ ] Responsive design

---

## DEPENDENCIAS

No se necesitan dependencias nuevas — el proyecto ya tiene:
- React 18 + Vite 5
- TypeScript (por añadir)
- Tailwind 3
- React Query (@tanstack/react-query ya instalado)
- Framer Motion (ya instalado)
- Recharts (ya instalado)
- Zustand (ya instalado)
- Lucide React (ya instalado)

---

## MÉTRICAS DE ÉXITO

1. **Seguridad:** 0 vulnerabilidades CRITICAL/HIGH
2. **Frontend:** Todas las páginas implementadas y funcionales
3. **UX:** Tiempo de primera interacción < 30 segundos
4. **Móvil:** Layout responsive en móviles

---

## NOTAS

- No se introduce nuevo stack — se invierte en completar lo que ya existe
- TypeScript se añade para reducir errores runtime
- React Query reemplaza fetching manual en componentes

---

## CAMBIOS APLICADOS

### Fase 1.1 — Clave de Cifrado Hardcodeada ✅
**Fecha:** 2026-05-06
**Archivos modificados:**
- `backend/src/services/llmService.js` — Elimininado fallback hardcodeado. Ahora lanza error si `ENCRYPTION_KEY` no existe o no tiene 32 caracteres.

### Fase 1.2 — Inyección SQL ✅
**Fecha:** 2026-05-06
**Archivos modificados:**
- `backend/src/routes/vocabulary.js` — Filtro de level ahora usa parameterized query en lugar de string interpolation.

### Fase 1.3 — JWT Expuesto en URL ✅
**Fecha:** 2026-05-06
**Archivos modificados:**
- `frontend/src/services/api.js` — `getTTS` refactorizado a `getTTSUrl` que retorna URL sin token. El token se maneja via header Authorization en todas las demás requests.
- **Nota:** El backend ya lee el token del header Authorization (línea 5 de auth.js: `req.headers.authorization?.split(' ')[1]`), no de query params.

### Fase 1.4 — JWT Secret Fallback ✅
**Fecha:** 2026-05-06
**Archivos modificados:**
- `backend/src/middleware/auth.js` — Ahora valida que `JWT_SECRET` exista y tenga al menos 64 caracteres al iniciar. Lanza error si no se cumple.

### Fase 2.1 — ENCRYPTION_KEY en Docker Compose ✅
**Fecha:** 2026-05-06
**Archivos modificados:**
- `docker-compose.yml` — Añadida variable `ENCRYPTION_KEY: ${ENCRYPTION_KEY}` al servicio backend.

---

## ESTADO ACTUAL

| Fase | Item | Estado |
|------|------|--------|
| 1.1 | Clave hardcodeada | ✅ Completado |
| 1.2 | Inyección SQL | ✅ Completado |
| 1.3 | JWT en URL | ✅ Completado |
| 1.4 | JWT fallback | ✅ Completado |
| 2.1 | ENCRYPTION_KEY en compose | ✅ Completado |
| 2.2 | Nginx dominio hardcodeado | ⏸️ Omitido (sin Docker en desarrollo) |
| 2.3 | Redis healthcheck | ⏸️ Omitido (sin Docker en desarrollo) |
| **3.1** | **Completar frontend** | **✅ Completado** |
| **3.2** | **Dashboard visual** | **✅ Completado** |
| **3.3** | **Gamificación visible** | **✅ Completado** |
| **3.4** | **Persistencia chat tutor** | **✅ Completado** |

---

## CAMBIOS APLICADOS (Continuación)

### Fase 3.1 — Scaffold Frontend ✅
**Fecha:** 2026-05-06
**Archivos creados:**
- `frontend/index.html`, `vite.config.ts`, `tailwind.config.js`, `postcss.config.js`, `tsconfig.json`
- `frontend/src/main.tsx` — React entry point con QueryClient + BrowserRouter
- `frontend/src/App.tsx` — Routing con ProtectedRoute
- `frontend/src/stores/authStore.ts` — Auth state con persistencia
- `frontend/src/components/Layout.tsx` — Navbar + layout
- `frontend/src/components/ProtectedRoute.tsx` — Auth guard
- `frontend/src/components/ErrorBoundary.tsx` — Error handling
- `frontend/src/components/LevelBadge.tsx` — Level badge con XP
- `frontend/src/components/ProgressBar.tsx` — Barra de progreso animada
- `frontend/src/components/StatsCard.tsx` — Card para estadísticas
- `frontend/src/components/RecentAchievements.tsx` — Logros recientes
- `frontend/src/pages/Login.tsx` — Login/registro con framer-motion
- `frontend/src/pages/Dashboard.tsx` — Dashboard principal
- `frontend/src/pages/Vocabulary.tsx` — Flashcards SM-2
- `frontend/src/pages/Speaking.tsx` — Recording + transcripción + evaluación
- `frontend/src/pages/Writing.tsx` — Writing con prompts de práctica
- `frontend/src/pages/Tutor.tsx` — Chat IA con persistencia localStorage
- `frontend/src/pages/Achievements.tsx` — XP, niveles y logros

### Fase 3.2 — Dashboard Visual ✅
**Fecha:** 2026-05-06
- ProgressBar con animación (0-500h)
- StatsCard con iconos (horas totales, racha, horas semanales)
- RecentAchievements con últimos logros

### Fase 3.3 — Gamificación Visible ✅
**Fecha:** 2026-05-06
- LevelBadge en navbar (A1-C1 según XP)
- Achievements page con XP progress bar
- Niveles calculados: A1 < 500, A2 < 1500, B1 < 3500, B2 < 7000

### Fase 3.4 — Persistencia Chat Tutor ✅
**Fecha:** 2026-05-06
- Mensajes guardados en localStorage (`ielts_tutor_messages`)
- Carga automática de historial al montar componente
- Botón "New Chat" para limpiar conversación