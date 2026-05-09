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

const mockLlmservice = {
  llmChat: vi.fn(),
  speechToText: vi.fn(),
  textToSpeech: vi.fn(),
};
vi.mock('../services/llmService.js', () => mockLlmservice);

const mockPool = await import('../db/pool.js').then(m => m.pool);

import speakingRouter from '../routes/speaking.js';

function authMiddleware(req, res, next) { req.user = { id: 'user-1' }; next(); }
function createApp() { const app = express(); app.use(express.json()); app.use('/api/speaking', authMiddleware, speakingRouter); return app; }

describe('speaking routes', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('POST /api/speaking/transcribe', () => {
    it('returns transcript from speechToText', async () => {
      mockLlmservice.speechToText.mockResolvedValue('Hello this is a test');

      const app = createApp();
      const res = await request(app)
        .post('/api/speaking/transcribe')
        .attach('audio', Buffer.from('fake-audio'), { filename: 'test.webm', contentType: 'audio/webm' });

      expect(res.status).toBe(200);
      expect(res.body.transcript).toBe('Hello this is a test');
    });
  });

  describe('POST /api/speaking/evaluate', () => {
    it('evaluates transcript and returns scores', async () => {
      mockLlmservice.llmChat.mockResolvedValue(JSON.stringify({
        fluency_score: 7, grammar_score: 6, vocabulary_score: 7, overall_score: 7,
        estimated_level: 'A2', feedback_es: 'Good work', corrected_version: 'Hello, this is...',
        one_tip: 'Practice linking words',
      }));
      mockPool.query.mockResolvedValue({ rows: [{ id: 'sess-1' }] });

      const app = createApp();
      const res = await request(app)
        .post('/api/speaking/evaluate')
        .send({ transcript: 'Hello this is test', mode: 'free', prompt_text: 'Introduce yourself', duration_seconds: 60 });

      expect(res.status).toBe(200);
      expect(res.body.fluency_score).toBe(7);
      expect(res.body.xp_earned).toBe(35);
    });
  });

  describe('GET /api/speaking/tts', () => {
    it('returns audio buffer from textToSpeech', async () => {
      mockLlmservice.textToSpeech.mockResolvedValue(Buffer.from('fake-mp3'));

      const app = createApp();
      const res = await request(app)
        .get('/api/speaking/tts')
        .query({ text: 'Hello world' });

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('audio/mpeg');
    });
  });
});