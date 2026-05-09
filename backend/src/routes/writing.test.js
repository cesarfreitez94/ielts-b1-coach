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

const mockLlmservice = { llmChat: vi.fn() };
vi.mock('../services/llmService.js', () => mockLlmservice);

const mockPool = await import('../db/pool.js').then(m => m.pool);

import writingRouter from '../routes/writing.js';

function authMiddleware(req, res, next) { req.user = { id: 'user-1' }; next(); }
function createApp() { const app = express(); app.use(express.json()); app.use('/api/writing', authMiddleware, writingRouter); return app; }

describe('writing routes', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('POST /api/writing/evaluate', () => {
    it('evaluates writing and returns scores', async () => {
      mockLlmservice.llmChat.mockResolvedValue(JSON.stringify({
        grammar_score: 6, vocabulary_score: 7, coherence_score: 6, overall_score: 6.5,
        estimated_level: 'A2', feedback_es: 'Good structure', corrected_version: 'Improved version',
        grammar_errors: ['Error: correction'],
      }));
      mockPool.query.mockResolvedValue({ rows: [] });

      const app = createApp();
      const res = await request(app)
        .post('/api/writing/evaluate')
        .send({ prompt_text: 'Describe your city', user_text: 'My city is big and nice' });

      expect(res.status).toBe(200);
      expect(res.body.overall_score).toBe(6.5);
      expect(res.body.xp_earned).toBe(26);
    });

    it('returns 500 when LLM call fails', async () => {
      mockLlmservice.llmChat.mockRejectedValue(new Error('API Error'));

      const app = createApp();
      const res = await request(app)
        .post('/api/writing/evaluate')
        .send({ prompt_text: 'Test', user_text: 'Test text' });

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('LLM error');
    });
  });
});