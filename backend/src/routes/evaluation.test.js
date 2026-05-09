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
const mockEvalAgent = await import('../agents/evaluationAgent.js').then(m => m);

import evaluationRouter from '../routes/evaluation.js';

function authMiddleware(req, res, next) { req.user = { id: 'user-1' }; next(); }
function createApp() { const app = express(); app.use(express.json()); app.use('/api/evaluation', authMiddleware, evaluationRouter); return app; }

describe('evaluation routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.clearAllMocks();
  });

  describe('POST /api/evaluation/run', () => {
    it('runs evaluation and returns result', async () => {
      mockEvalAgent.runDailyEvaluation.mockResolvedValue({
        overall_level: 'A2', on_track: true, vocabulary_score: 6,
        grammar_score: 5, speaking_score: 6, writing_score: 5, listening_score: 5,
        weak_areas: ['grammar'], recommended_focus: 'Focus on grammar',
      });

      const app = createApp();
      const res = await request(app).post('/api/evaluation/run');

      expect(res.status).toBe(200);
      expect(res.body.overall_level).toBe('A2');
    });
  });

  describe('GET /api/evaluation/latest', () => {
    it('returns most recent evaluation', async () => {
      mockPool.query.mockResolvedValue({
        rows: [{ id: 1, overall_level: 'A2', created_at: '2025-01-01' }],
      });

      const app = createApp();
      const res = await request(app).get('/api/evaluation/latest');

      expect(res.status).toBe(200);
      expect(res.body.overall_level).toBe('A2');
    });

    it('returns null when no evaluations exist', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const app = createApp();
      const res = await request(app).get('/api/evaluation/latest');

      expect(res.status).toBe(200);
      expect(res.body).toBeNull();
    });
  });

  describe('GET /api/evaluation/history', () => {
    it('returns last 12 evaluations', async () => {
      mockPool.query.mockResolvedValue({
        rows: [
          { id: 1, overall_level: 'A2', created_at: '2025-01-01' },
          { id: 2, overall_level: 'A1', created_at: '2024-12-01' },
        ],
      });

      const app = createApp();
      const res = await request(app).get('/api/evaluation/history');

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
    });
  });
});