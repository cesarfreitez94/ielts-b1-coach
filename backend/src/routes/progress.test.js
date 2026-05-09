import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

vi.mock('../db/pool.js', () => ({
  pool: { query: vi.fn() },
}));
vi.mock('../logger.js', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn(), child: vi.fn(() => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() })) },
}));
vi.mock('../routes/gamification.js', () => ({
  checkAndAwardAchievements: vi.fn().mockResolvedValue([]),
}));

const mockPool = await import('../db/pool.js').then(m => m.pool);

import progressRouter from '../routes/progress.js';

function authMiddleware(req, res, next) {
  req.user = { id: 'user-1', email: 'test@example.com' };
  next();
}

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/progress', authMiddleware, progressRouter);
  return app;
}

describe('progress routes', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('GET /api/progress/dashboard', () => {
    it('aggregates dashboard data correctly', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ total_xp: 500, current_level: 'A2', total_minutes_studied: 3000 }] })
        .mockResolvedValueOnce({ rows: [{ minutes_study: 60 }] })
        .mockResolvedValueOnce({ rows: [{ overall_level: 'A2', weak_areas: ['speaking'] }] })
        .mockResolvedValueOnce({ rows: [{ task_key: 'flash', task_name: 'Flashcards', completed: false }] })
        .mockResolvedValueOnce({ rows: [] });

      const app = createApp();
      const res = await request(app).get('/api/progress/dashboard');

      expect(res.status).toBe(200);
      expect(res.body.stats.total_xp).toBe(500);
      expect(res.body.hoursProgress.total).toBe(5);
      expect(res.body.tasks).toHaveLength(1);
    });

    it('handles empty stats', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      const app = createApp();
      const res = await request(app).get('/api/progress/dashboard');

      expect(res.status).toBe(200);
      expect(res.body.stats).toEqual({});
    });
  });

  describe('POST /api/progress/log-time', () => {
    it('logs time for valid type', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const app = createApp();
      const res = await request(app)
        .post('/api/progress/log-time')
        .send({ type: 'speaking', minutes: 30 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('returns 400 for invalid type', async () => {
      const app = createApp();
      const res = await request(app)
        .post('/api/progress/log-time')
        .send({ type: 'invalid', minutes: 30 });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Invalid type');
    });
  });

  describe('POST /api/progress/complete-task', () => {
    it('awards XP for completed task', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ xp_reward: 35 }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      const app = createApp();
      const res = await request(app)
        .post('/api/progress/complete-task')
        .send({ task_key: 'flash' });

      expect(res.status).toBe(200);
      expect(res.body.xp_earned).toBe(35);
    });

    it('returns already_done when task not found', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const app = createApp();
      const res = await request(app)
        .post('/api/progress/complete-task')
        .send({ task_key: 'flash' });

      expect(res.status).toBe(200);
      expect(res.body.already_done).toBe(true);
    });
  });

  describe('GET /api/progress/history', () => {
    it('returns last 30 days of progress', async () => {
      mockPool.query.mockResolvedValue({
        rows: [
          { date: '2025-01-01', total_minutes: 60, xp_earned: 30, tasks_completed: 2 },
          { date: '2025-01-02', total_minutes: 45, xp_earned: 20, tasks_completed: 1 },
        ],
      });

      const app = createApp();
      const res = await request(app).get('/api/progress/history');

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
    });
  });
});