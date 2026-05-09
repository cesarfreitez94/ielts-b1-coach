import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import Achievements from '../pages/Achievements';

const server = setupServer();

function wrapper() {
  const queryClient = new QueryClient();
  return (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter><Achievements /></MemoryRouter>
    </QueryClientProvider>
  );
}

beforeEach(() => server.listen());
afterEach(() => { server.resetHandlers(); server.close(); });

describe('Achievements', () => {
  it('renders achievements page', async () => {
    server.use(
      http.get('/api/gamification', () => HttpResponse.json([
        { id: 1, key: 'first_card', name: 'First Card', description: 'Learn your first word', earned: true, earned_at: '2025-01-01' },
        { id: 2, key: 'streak_7', name: '7 Day Streak', description: 'Study 7 days in a row', earned: false },
      ])),
      http.get('/api/gamification/xp-history', () => HttpResponse.json([{ total_xp: 500 }]))
    );

    render(wrapper());
    await waitFor(() => {
      expect(screen.getByText('Achievements & Progress')).toBeInTheDocument();
    });
  });

  it('shows locked/unlocked achievement styling', async () => {
    server.use(
      http.get('/api/gamification', () => HttpResponse.json([
        { id: 1, name: 'First Card', earned: true, earned_at: '2025-01-01' },
        { id: 2, name: '7 Day Streak', earned: false },
      ])),
      http.get('/api/gamification/xp-history', () => HttpResponse.json({ total_xp: 100 }))
    );

    render(wrapper());
    await waitFor(() => {
      const firstCard = screen.getByText('First Card').closest('.rounded-xl');
      expect(firstCard).toBeTruthy();
    });
  });

  it('shows XP bar with level progress', async () => {
    server.use(
      http.get('/api/gamification', () => HttpResponse.json([])),
      http.get('/api/gamification/xp-history', () => HttpResponse.json({ total_xp: 600 }))
    );

    render(wrapper());
    await waitFor(() => {
      expect(screen.getByText('Level A2')).toBeInTheDocument();
    });
  });
});