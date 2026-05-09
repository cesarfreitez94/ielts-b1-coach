import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import Settings from '../pages/Settings';

const server = setupServer();

function wrapper() {
  const queryClient = new QueryClient();
  return (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter><Settings /></MemoryRouter>
    </QueryClientProvider>
  );
}

beforeEach(() => server.listen());
afterEach(() => { server.resetHandlers(); server.close(); });

describe('Settings', () => {
  it('renders provider selector and model dropdown', async () => {
    server.use(http.get('/api/config', () => HttpResponse.json({ llm_provider: 'kimi', llm_model: 'kimi-k2.5' })));

    render(wrapper());
    await waitFor(() => {
      expect(screen.getByText('AI Provider')).toBeInTheDocument();
      expect(screen.getByText('Kimi (Moonshot)')).toBeInTheDocument();
    });
  });

  it('shows API key input field', async () => {
    server.use(http.get('/api/config', () => HttpResponse.json({ llm_provider: 'kimi' })));

    render(wrapper());
    await waitFor(() => {
      expect(screen.getByText('API Key (optional)')).toBeInTheDocument();
    });
  });

  it('shows daily goal minutes input', async () => {
    server.use(http.get('/api/config', () => HttpResponse.json({ daily_goal_minutes: 180 })));

    render(wrapper());
    await waitFor(() => {
      expect(screen.getByText('Minutes per day')).toBeInTheDocument();
    });
  });

  it('saves settings on submit', async () => {
    server.use(
      http.get('/api/config', () => HttpResponse.json({ llm_provider: 'kimi' })),
      http.put('/api/config', () => HttpResponse.json({ success: true }))
    );

    render(wrapper());
    await waitFor(() => {
      const btn = screen.getByText('Save Settings');
      fireEvent.click(btn);
    });

    await waitFor(() => {
      expect(screen.getByText('Settings saved')).toBeInTheDocument();
    });
  });

  it('changes model when provider changes', async () => {
    server.use(http.get('/api/config', () => HttpResponse.json({ llm_provider: 'kimi' })));

    render(wrapper());
    await waitFor(() => {
      const select = screen.getByRole('combobox').closest('select');
      if (select) fireEvent.change(select, { target: { value: 'anthropic' } });
    });

    await waitFor(() => {
      expect(screen.getByText('claude-sonnet-4-20250514')).toBeInTheDocument();
    });
  });
});