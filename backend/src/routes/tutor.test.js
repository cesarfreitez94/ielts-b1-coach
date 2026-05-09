import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

vi.mock('../db/pool.js', () => ({
  pool: { query: vi.fn() },
}));
vi.mock('../logger.js', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn(), child: vi.fn(() => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() })) },
}));

const mockPool = await import('../db/pool.js').then(m => m.pool);
const mockLlmservice = await import('../services/llmService.js').then(m => m.llmChat);

import tutorRouter from '../routes/tutor.js';

function authMiddleware(req, res, next) { req.user = { id: 'user-1' }; next(); }
function createApp() { const app = express(); app.use(express.json()); app.use('/api/tutor', authMiddleware, tutorRouter); return app; }

describe('tutor routes', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('POST /api/tutor/chat', () => {
    it('returns AI reply with session_id', async () => {
      mockLlmservice.mockResolvedValue('That is a great question!');

      mockPool.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ total_xp: 100, current_level: 'A2', streak_days: 3, total_words_studied: 50, total_minutes_studied: 120 }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      const app = createApp();
      const res = await request(app)
        .post('/api/tutor/chat')
        .send({ message: 'How do I improve my speaking?', session_id: null });

      expect(res.status).toBe(200);
      expect(res.body.reply).toBeDefined();
      expect(res.body.session_id).toBeDefined();
    });
  });

  describe('GET /api/tutor/sessions', () => {
    it('returns recent sessions', async () => {
      mockPool.query.mockResolvedValue({
        rows: [
          { session_id: 'sess-1', started: '2025-01-01', messages: 10 },
          { session_id: 'sess-2', started: '2025-01-02', messages: 5 },
        ],
      });

      const app = createApp();
      const res = await request(app).get('/api/tutor/sessions');

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
    });
  });
});