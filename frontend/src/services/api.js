import axios from 'axios';
import clientLogger from './logger';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
  timeout: 30000,
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('ielts_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto logout on 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    clientLogger.error(`API Error: ${err.config?.url}`, {
      status: err.response?.status,
      statusText: err.response?.statusText,
    });
    if (err.response?.status === 401) {
      localStorage.removeItem('ielts_token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// ── Auth ─────────────────────────────────────────────────────────
export const authAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (email, password, name) => api.post('/auth/register', { email, password, name }),
};

// ── Config ───────────────────────────────────────────────────────
export const configAPI = {
  get: () => api.get('/config'),
  update: (data) => api.put('/config', data),
  test: (service) => api.post('/config/test', { service }),
};

// ── Progress / Dashboard ─────────────────────────────────────────
export const progressAPI = {
  dashboard: () => api.get('/progress/dashboard'),
  history: () => api.get('/progress/history'),
  logTime: (type, minutes) => api.post('/progress/log-time', { type, minutes }),
  completeTask: (task_key) => api.post('/progress/complete-task', { task_key }),
};

// ── Vocabulary ───────────────────────────────────────────────────
export const vocabAPI = {
  getDue: (level) => api.get('/vocabulary/due', { params: { level } }),
  answer: (vocab_id, quality) => api.post('/vocabulary/answer', { vocab_id, quality }),
};

// ── Speaking ─────────────────────────────────────────────────────
export const speakingAPI = {
  transcribe: (audioBlob) => {
    const form = new FormData();
    form.append('audio', audioBlob, 'recording.webm');
    return api.post('/speaking/transcribe', form, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 60000 });
  },
  evaluate: (data) => api.post('/speaking/evaluate', data, { timeout: 60000 }),
  getTTSUrl: (text) => {
    const url = new URL(`${api.defaults.baseURL}/speaking/tts`);
    url.searchParams.set('text', text);
    return url.toString();
  },
};

// ── Writing ──────────────────────────────────────────────────────
export const writingAPI = {
  evaluate: (user_text, prompt_text) => api.post('/writing/evaluate', { user_text, prompt_text }, { timeout: 60000 }),
};

// ── Tutor ────────────────────────────────────────────────────────
export const tutorAPI = {
  chat: (message, session_id) => api.post('/tutor/chat', { message, session_id }),
  sessions: () => api.get('/tutor/sessions'),
};

// ── Gamification ─────────────────────────────────────────────────
export const gamificationAPI = {
  achievements: () => api.get('/gamification'),
  xpHistory: () => api.get('/gamification/xp-history'),
  leaderboard: () => api.get('/gamification/leaderboard'),
};

// ── Evaluation ───────────────────────────────────────────────────
export const evaluationAPI = {
  run: () => api.post('/evaluation/run', {}, { timeout: 120000 }),
  latest: () => api.get('/evaluation/latest'),
  history: () => api.get('/evaluation/history'),
};

export default api;
