import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import Vocabulary from '../pages/Vocabulary';

const server = setupServer();

function wrapper() {
  const queryClient = new QueryClient();
  return (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter><Vocabulary /></MemoryRouter>
    </QueryClientProvider>
  );
}

beforeEach(() => server.listen());
afterEach(() => { server.resetHandlers(); server.close(); });

describe('Vocabulary', () => {
  it('shows loading spinner initially', () => {
    server.use(http.get('/api/vocabulary/due', () => new Promise(() => {})));
    render(wrapper());
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('shows all caught up when no cards due', async () => {
    server.use(http.get('/api/vocabulary/due', () => HttpResponse.json([])));

    render(wrapper());
    await waitFor(() => {
      expect(screen.getByText('All caught up!')).toBeInTheDocument();
    });
  });

  it('displays flashcard when cards are due', async () => {
    server.use(http.get('/api/vocabulary/due', () => HttpResponse.json([
      { id: 1, word: 'hello', phonetic: '/həˈloʊ/', translation: 'hola', level: 'A1', example: 'Hello world' }
    ])));

    render(wrapper());
    await waitFor(() => {
      expect(screen.getByText('hello')).toBeInTheDocument();
      expect(screen.getByText('/həˈloʊ/')).toBeInTheDocument();
      expect(screen.getByText('hola')).toBeInTheDocument();
    });
  });

  it('renders quality buttons (Again/Hard/Good/Easy)', async () => {
    server.use(http.get('/api/vocabulary/due', () => HttpResponse.json([
      { id: 1, word: 'test', phonetic: '/test/', translation: 'prueba', level: 'A1' }
    ])));

    render(wrapper());
    await waitFor(() => {
      expect(screen.getByText('Again')).toBeInTheDocument();
      expect(screen.getByText('Hard')).toBeInTheDocument();
      expect(screen.getByText('Good')).toBeInTheDocument();
      expect(screen.getByText('Easy')).toBeInTheDocument();
    });
  });

  it('calls answer API with quality on button click', async () => {
    let answerCall: { vocab_id: number; quality: number } | null = null;
    server.use(
      http.get('/api/vocabulary/due', () => HttpResponse.json([
        { id: 1, word: 'test', phonetic: '/test/', translation: 'prueba', level: 'A1' }
      ])),
      http.post('/api/vocabulary/answer', async ({ request }) => {
        answerCall = await request.json() as { vocab_id: number; quality: number };
        return HttpResponse.json({ xp_earned: 10, next_review: '2025-01-10', status: 'learning' });
      })
    );

    render(wrapper());
    await waitFor(() => screen.getByText('Good'));

    fireEvent.click(screen.getByText('Good'));

    await waitFor(() => {
      expect(answerCall?.vocab_id).toBe(1);
      expect(answerCall?.quality).toBe(3);
    });
  });
});