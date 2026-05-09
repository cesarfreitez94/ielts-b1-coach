import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import nock from 'nock';
import CryptoJS from 'crypto-js';

const ENCRYPTION_KEY = 'test-encryption-key-that-is-at-least-30-chars!';

const mockPool = { query: vi.fn() };
vi.mock('../db/pool.js', () => ({ pool: mockPool }));
const mockLogger = { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn(), child: vi.fn(() => mockLogger) };
vi.mock('../logger.js', () => ({ logger: mockLogger }));

vi.mock('@anthropic-ai/sdk', () => ({
  default: { messages: { create: vi.fn() } },
}));
vi.mock('openai', () => ({
  default: { Chat: { completions: { create: vi.fn() } } },
}));

const llmService = await import('../services/llmService.js');
const { encryptKey, decryptKey } = llmService;

function encrypt(k) { return CryptoJS.AES.encrypt(k, ENCRYPTION_KEY).toString(); }

describe('llmService', () => {
  beforeEach(() => {
    process.env.KIMI_API_KEY = 'test-kimi-key';
    process.env.DEEPSEEK_API_KEY = 'test-deepseek-key';
    process.env.ENCRYPTION_KEY = ENCRYPTION_KEY;
    vi.clearAllMocks();
    nock.cleanAll();
  });

  afterEach(() => nock.cleanAll());

  describe('encryptKey / decryptKey', () => {
    it('encrypts and decrypts a key correctly', () => {
      const original = 'my-secret-api-key';
      const encrypted = encrypt(original);
      expect(encrypted).not.toBe(original);
      expect(decryptKey(encrypted)).toBe(original);
    });

    it('decryptKey returns null for falsy input', () => {
      expect(decryptKey(null)).toBeNull();
      expect(decryptKey('')).toBeNull();
    });

    it('different plaintext produces different ciphertext', () => {
      const enc1 = encrypt('key1');
      const enc2 = encrypt('key2');
      expect(enc1).not.toBe(enc2);
    });
  });

  describe('llmChat', () => {
    const mockUserId = 'user-123';
    const mockConfig = {
      llm_provider: 'kimi',
      llm_model: 'kimi-k2.5',
      llm_api_key_enc: encrypt('user-kimi-key'),
    };

    beforeEach(() => {
      mockPool.query.mockResolvedValue({ rows: [mockConfig] });
    });

    it('throws when no config found for user', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });
      await expect(llmService.llmChat({ userId: 'unknown', messages: [] })).rejects.toThrow('No config found');
    });

    it('throws when no API key resolved', async () => {
      mockPool.query.mockResolvedValue({ rows: [{ ...mockConfig, llm_api_key_enc: null }] });
      await expect(llmService.llmChat({ userId: mockUserId, messages: [] })).rejects.toThrow('No API key for kimi');
    });

    it('calls kimi provider correctly', async () => {
      const scope = nock('https://api.moonshot.ai')
        .post('/v1/chat/completions')
        .reply(200, { choices: [{ message: { content: 'Test response' } }] });

      const result = await llmService.llmChat({
        userId: mockUserId,
        messages: [{ role: 'user', content: 'hello' }],
        system: 'You are a helpful assistant.',
        maxTokens: 100,
      });

      expect(result).toBe('Test response');
      scope.done();
    });

    it('calls anthropic provider correctly', async () => {
      mockPool.query.mockResolvedValue({
        rows: [{ ...mockConfig, llm_provider: 'anthropic', llm_api_key_enc: encrypt('user-anthropic-key') }],
      });

      const scope = nock('https://api.anthropic.com')
        .post('/v1/messages')
        .reply(200, { content: [{ text: 'Anthropic response' }] });

      const result = await llmService.llmChat({
        userId: mockUserId,
        messages: [{ role: 'user', content: 'hello' }],
        maxTokens: 100,
      });

      expect(result).toBe('Anthropic response');
      scope.done();
    });

    it('throws on unknown provider', async () => {
      mockPool.query.mockResolvedValue({
        rows: [{ ...mockConfig, llm_provider: 'unknown_provider' }],
      });
      await expect(llmService.llmChat({ userId: mockUserId, messages: [] })).rejects.toThrow('Unknown LLM provider');
    });

    it('logs error on provider failure', async () => {
      nock('https://api.moonshot.ai').post('/v1/chat/completions').reply(500, 'Server Error');

      await expect(llmService.llmChat({ userId: mockUserId, messages: [{ role: 'user', content: 'hello' }] })).rejects.toThrow();
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('textToSpeech', () => {
    it('routes to openai when provider is openai', async () => {
      const scope = nock('https://api.openai.com')
        .post('/v1/audio/speech')
        .reply(200, Buffer.from('audio-data'));

      mockPool.query.mockResolvedValue({
        rows: [{ tts_provider: 'openai', tts_api_key_enc: encrypt('test-key'), tts_voice: 'alloy' }],
      });

      const result = await llmService.textToSpeech({ userId: 'user-1', text: 'Hello' });
      expect(Buffer.isBuffer(result)).toBe(true);
      scope.done();
    });

    it('routes to local piper when provider is local', async () => {
      mockPool.query.mockResolvedValue({ rows: [{ tts_provider: 'local' }] });

      const scope = nock('http://localhost:5000')
        .post('/tts')
        .reply(200, Buffer.from('piper-audio'));

      const result = await llmService.textToSpeech({ userId: 'user-1', text: 'Hello' });
      expect(Buffer.isBuffer(result)).toBe(true);
      scope.done();
    });

    it('throws on unknown provider', async () => {
      mockPool.query.mockResolvedValue({ rows: [{ tts_provider: 'unknown' }] });
      await expect(llmService.textToSpeech({ userId: 'user-1', text: 'Hello' })).rejects.toThrow('Unknown TTS provider');
    });
  });

  describe('speechToText', () => {
    it('routes to local whisper when provider is local', async () => {
      mockPool.query.mockResolvedValue({ rows: [{ stt_provider: 'local' }] });

      const scope = nock('http://localhost:8080')
        .post('/inference')
        .reply(200, { text: 'transcribed speech' });

      const result = await llmService.speechToText({ userId: 'user-1', audioBuffer: Buffer.from('audio'), mimeType: 'audio/webm' });
      expect(result).toBe('transcribed speech');
      scope.done();
    });

    it('throws on unknown provider', async () => {
      mockPool.query.mockResolvedValue({ rows: [{ stt_provider: 'unknown' }] });
      await expect(llmService.speechToText({ userId: 'user-1', audioBuffer: Buffer.from('audio') })).rejects.toThrow('Unknown STT provider');
    });
  });
});