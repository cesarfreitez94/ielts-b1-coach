import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import Dashboard from '../pages/Dashboard';

const server = setupServer();

function wrapper() {
  const queryClient = new QueryClient();
  return (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter><Dashboard /></MemoryRouter>
    </QueryClientProvider>
  );
}

beforeEach(() => server.listen());
afterEach(() => { server.resetHandlers(); server.close(); });

describe('Dashboard', () => {
  it('renders loading skeleton initially', () => {
    server.use(http.get('/api/progress/dashboard', () => new Promise(() => {})));
    render(wrapper());
  });

  it('renders stats cards when loaded', async () => {
    server.use(
      http.get('/api/progress/dashboard', () => HttpResponse.json({
        stats: { total_xp: 500, current_level: 'A2', total_minutes_studied: 3000, streak_days: 3 },
        today: {}, lastEvaluation: null, tasks: [], recentAchievements: [],
        hoursProgress: { total: 5, target: 500, pct: 1 },
      })),
      http.get('/api/gamification', () => HttpResponse.json([]))
    );

    render(wrapper());
    await waitFor(() => {
      expect(screen.getByText('Your Progress')).toBeInTheDocument();
    });
  });

  it('shows practice area cards', async () => {
    server.use(
      http.get('/api/progress/dashboard', () => HttpResponse.json({
        stats: {}, today: {}, lastEvaluation: null, tasks: [], recentAchievements: [],
        hoursProgress: { total: 0, target: 500, pct: 0 },
      })),
      http.get('/api/gamification', () => HttpResponse.json([]))
    );

    render(wrapper());
    await waitFor(() => {
      expect(screen.getByText('Vocabulary')).toBeInTheDocument();
      expect(screen.getByText('Speaking')).toBeInTheDocument();
      expect(screen.getByText('Writing')).toBeInTheDocument();
      expect(screen.getByText('AI Tutor')).toBeInTheDocument();
    });
  });

  it('handles empty stats gracefully', async () => {
    server.use(
      http.get('/api/progress/dashboard', () => HttpResponse.json({
        stats: {}, today: {}, lastEvaluation: null, tasks: [], recentAchievements: [],
        hoursProgress: { total: 0, target: 500, pct: 0 },
      })),
      http.get('/api/gamification', () => HttpResponse.json([]))
    );

    render(wrapper());
    await waitFor(() => {
      expect(screen.getByText('0h')).toBeInTheDocument();
    });
  });
});