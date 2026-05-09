import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

vi.mock('../db/pool.js', () => ({
  pool: { query: vi.fn() },
}));
vi.mock('../logger.js', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn(), child: vi.fn(() => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() })) },
}));
vi.mock('./gamification.js', () => ({
  checkAndAwardAchievements: vi.fn().mockResolvedValue([]),
}));

const mockPool = await import('../db/pool.js').then(m => m.pool);

import vocabularyRouter from '../routes/vocabulary.js';

function authMiddleware(req, res, next) { req.user = { id: 'user-1' }; next(); }
function createApp() { const app = express(); app.use(express.json()); app.use('/api/vocabulary', authMiddleware, vocabularyRouter); return app; }

describe('vocabulary routes', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('GET /api/vocabulary/due', () => {
    it('returns due flashcards for user level', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ current_level: 'A2' }] })
        .mockResolvedValueOnce({ rows: [
          { id: 1, word: 'hello', phonetic: '/həˈloʊ/', translation: 'hola', ease_factor: 2.5, status: 'learning' },
        ] });

      const app = createApp();
      const res = await request(app).get('/api/vocabulary/due');

      expect(res.status).toBe(200);
      expect(res.body[0].word).toBe('hello');
    });

    it('filters by level when specified', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ current_level: 'B1' }] })
        .mockResolvedValueOnce({ rows: [] });

      const app = createApp();
      const res = await request(app).get('/api/vocabulary/due?level=A1');

      expect(res.status).toBe(200);
    });
  });

  describe('POST /api/vocabulary/answer', () => {
    it('applies SM-2 algorithm correctly for quality >= 3', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ ease_factor: 2.5, interval_days: 1, repetitions: 1 }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      const app = createApp();
      const res = await request(app)
        .post('/api/vocabulary/answer')
        .send({ vocab_id: 1, quality: 4 });

      expect(res.status).toBe(200);
      expect(res.body.xp_earned).toBeGreaterThan(0);
      expect(res.body.next_review).toBeDefined();
    });

    it('resets interval for quality < 3', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ ease_factor: 2.5, interval_days: 10, repetitions: 3 }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      const app = createApp();
      const res = await request(app)
        .post('/api/vocabulary/answer')
        .send({ vocab_id: 1, quality: 2 });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('learning');
    });

    it('awards more XP for quality 5', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ ease_factor: 2.5, interval_days: 1, repetitions: 0 }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      const app = createApp();
      const res = await request(app)
        .post('/api/vocabulary/answer')
        .send({ vocab_id: 1, quality: 5 });

      expect(res.status).toBe(200);
      expect(res.body.xp_earned).toBe(10);
    });
  });
});