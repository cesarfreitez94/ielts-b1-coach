import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

vi.mock('../db/pool.js', () => ({
  pool: { query: vi.fn() },
}));
vi.mock('../logger.js', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn(), child: vi.fn(() => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() })) },
}));
vi.mock('../services/llmService.js', () => ({
  encryptKey: vi.fn((key) => `encrypted_${key}`),
  decryptKey: vi.fn((enc) => (enc ? enc.replace('encrypted_', '') : null)),
  llmChat: vi.fn(),
  textToSpeech: vi.fn(),
}));

const mockPool = await import('../db/pool.js').then(m => m.pool);

import configRouter from '../routes/config.js';

function authMiddleware(req, res, next) {
  req.user = { id: 'user-1', email: 'test@example.com' };
  next();
}

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/config', authMiddleware, configRouter);
  return app;
}

describe('config routes', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('GET /api/config', () => {
    it('returns config with masked key flags', async () => {
      mockPool.query.mockResolvedValue({
        rows: [{
          llm_provider: 'kimi', llm_model: 'kimi-k2.5', llm_api_key_enc: 'encrypted_key',
          tts_provider: 'openai', tts_voice: 'alloy', tts_api_key_enc: 'encrypted_key',
          stt_provider: 'deepgram', stt_api_key_enc: null, daily_goal_minutes: 120,
          target_exam_date: '2025-06-01',
        }],
      });

      const app = createApp();
      const res = await request(app).get('/api/config');

      expect(res.status).toBe(200);
      expect(res.body.llm_provider).toBe('kimi');
      expect(res.body.llm_key_set).toBe(true);
      expect(res.body.tts_key_set).toBe(true);
      expect(res.body.stt_key_set).toBe(false);
    });

    it('returns empty object when no config exists', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const app = createApp();
      const res = await request(app).get('/api/config');

      expect(res.status).toBe(200);
      expect(res.body).toEqual({});
    });
  });

  describe('PUT /api/config', () => {
    it('updates config fields', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const app = createApp();
      const res = await request(app)
        .put('/api/config')
        .send({ llm_provider: 'anthropic', daily_goal_minutes: 180 });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('POST /api/config/test', () => {
    it('returns success for llm test', async () => {
      const { llmChat } = await import('../services/llmService.js');
      llmChat.mockResolvedValue('OK');

      const app = createApp();
      const res = await request(app)
        .post('/api/config/test')
        .send({ service: 'llm' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('returns success for tts test', async () => {
      const { textToSpeech } = await import('../services/llmService.js');
      textToSpeech.mockResolvedValue(Buffer.from('audio-data'));

      const app = createApp();
      const res = await request(app)
        .post('/api/config/test')
        .send({ service: 'tts' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.bytes).toBeDefined();
    });

    it('returns error for unknown service', async () => {
      const app = createApp();
      const res = await request(app)
        .post('/api/config/test')
        .send({ service: 'unknown' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(false);
    });
  });
});