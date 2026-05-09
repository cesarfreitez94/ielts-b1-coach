import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import bcrypt from 'bcryptjs';

vi.mock('../db/pool.js', () => ({
  pool: { query: vi.fn() },
}));
vi.mock('../logger.js', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn(), child: vi.fn(() => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() })) },
}));

const mockPool = await import('../db/pool.js').then(m => m.pool);

import authRouter from '../routes/auth.js';

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRouter);
  return app;
}

describe('auth routes', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('POST /api/auth/register', () => {
    it('registers a new user and returns token', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ id: 'new-user-id', email: 'test@example.com', name: 'Test User' }] });

      const app = createApp();
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'test@example.com', password: 'password123', name: 'Test User' });

      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.email).toBe('test@example.com');
    });

    it('returns 400 when email already exists', async () => {
      const err = new Error('duplicate key');
      err.code = '23505';
      mockPool.query.mockRejectedValue(err);

      const app = createApp();
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'existing@example.com', password: 'password123', name: 'Test' });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/auth/login', () => {
    it('returns token for valid credentials', async () => {
      const hash = await bcrypt.hash('correct-password', 12);
      mockPool.query.mockResolvedValue({ rows: [{ id: 'user-1', email: 'user@example.com', name: 'User', password_hash: hash }] });

      const app = createApp();
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'user@example.com', password: 'correct-password' });

      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.email).toBe('user@example.com');
    });

    it('returns 401 for unknown email', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const app = createApp();
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'unknown@example.com', password: 'password' });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Invalid credentials');
    });

    it('returns 401 for wrong password', async () => {
      const hash = await bcrypt.hash('correct-password', 12);
      mockPool.query.mockResolvedValue({ rows: [{ id: 'user-1', email: 'user@example.com', name: 'User', password_hash: hash }] });

      const app = createApp();
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'user@example.com', password: 'wrong-password' });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Invalid credentials');
    });
  });
});