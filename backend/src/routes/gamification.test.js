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

import gamificationRouter, { checkAndAwardAchievements } from '../routes/gamification.js';

function authMiddleware(req, res, next) { req.user = { id: 'user-1' }; next(); }
function createApp() { const app = express(); app.use(express.json()); app.use('/api/gamification', authMiddleware, gamificationRouter); return app; }

describe('gamification routes', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('GET /api/gamification', () => {
    it('returns all achievements with earned status', async () => {
      mockPool.query.mockResolvedValue({
        rows: [
          { id: 1, key: 'first_card', name: 'First Card', xp_reward: 10, category: 'vocabulary', earned: true, earned_at: '2025-01-01' },
          { id: 2, key: 'streak_7', name: '7 Day Streak', xp_reward: 25, category: 'streak', earned: false },
        ],
      });

      const app = createApp();
      const res = await request(app).get('/api/gamification');

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      expect(res.body[0].earned).toBe(true);
    });
  });

  describe('GET /api/gamification/xp-history', () => {
    it('returns recent XP transactions', async () => {
      mockPool.query.mockResolvedValue({
        rows: [
          { id: 1, amount: 30, source: 'flashcard', description: 'Vocabulary practice', created_at: '2025-01-01' },
        ],
      });

      const app = createApp();
      const res = await request(app).get('/api/gamification/xp-history');

      expect(res.status).toBe(200);
      expect(res.body[0].amount).toBe(30);
    });
  });

  describe('GET /api/gamification/leaderboard', () => {
    it('returns top users by XP', async () => {
      mockPool.query.mockResolvedValue({
        rows: [
          { name: 'Alice', total_xp: 500, streak_days: 7, current_level: 'A2', total_words_studied: 200 },
          { name: 'Bob', total_xp: 350, streak_days: 3, current_level: 'A1', total_words_studied: 100 },
        ],
      });

      const app = createApp();
      const res = await request(app).get('/api/gamification/leaderboard');

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
    });
  });

  describe('checkAndAwardAchievements', () => {
    it('awards first_card achievement when words studied >= 1', async () => {
      const stats = { total_words_studied: 1, streak_days: 0, speaking_sessions: 0, writing_submissions: 0, current_level: 'A1', total_minutes_studied: 0 };
      mockPool.query
        .mockResolvedValueOnce({ rows: [stats] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ id: 1, key: 'first_card', name: 'First Card', xp_reward: 10, requirement_value: 1 }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await checkAndAwardAchievements('user-1');

      expect(result).toHaveLength(1);
      expect(result[0].key).toBe('first_card');
    });

    it('does not award already earned achievements', async () => {
      const stats = { total_words_studied: 10, streak_days: 0, speaking_sessions: 0, writing_submissions: 0, current_level: 'A1', total_minutes_studied: 0 };
      mockPool.query
        .mockResolvedValueOnce({ rows: [stats] })
        .mockResolvedValueOnce({ rows: [{ id: 1 }] })
        .mockResolvedValueOnce({ rows: [{ id: 2, key: 'first_card', name: 'First Card', xp_reward: 10, requirement_value: 1 }] });

      const result = await checkAndAwardAchievements('user-1');

      expect(result).toHaveLength(0);
    });
  });
});