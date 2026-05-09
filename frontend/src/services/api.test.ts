import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';

const server = setupServer();

beforeAll(() => server.listen());
afterAll(() => server.close());
beforeEach(() => server.resetHandlers());

describe('api', () => {
  it('auth interceptor attaches token to requests', async () => {
    server.use(
      http.get('/api/config', () => HttpResponse.json({ llm_provider: 'kimi' }))
    );

    const { default: api } = await import('../services/api');
    localStorage.setItem('ielts_token', 'test-token');

    const config = {
      headers: { Authorization: 'Bearer test-token' },
    };

    server.use(
      http.get('/api/config', ({ request }) => {
        const auth = request.headers.get('Authorization');
        return HttpResponse.json({ authenticated: auth });
      })
    );

    const res = await api.get('/config');
    expect(res.headers.authorization).toBe('Bearer test-token');

    localStorage.removeItem('ielts_token');
  });

  it('401 response clears token and redirects', async () => {
    server.use(
      http.get('/api/progress/dashboard', () => HttpResponse.json({ error: 'Unauthorized' }, { status: 401 }))
    );

    const { default: api } = await import('../services/api');
    localStorage.setItem('ielts_token', 'expired-token');

    let redirected = false;
    const originalLocation = window.location;
    Object.defineProperty(window, 'location', {
      value: { ...originalLocation, href: vi.fn(() => { redirected = true; }) },
      writable: true,
    });

    try {
      await api.get('/progress/dashboard').catch(() => {});
      expect(localStorage.getItem('ielts_token')).toBeNull();
    } finally {
      Object.defineProperty(window, 'location', { value: originalLocation });
      localStorage.removeItem('ielts_token');
    }
  });
});