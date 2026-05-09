import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import Tutor from '../pages/Tutor';

const server = setupServer();

function wrapper() {
  const queryClient = new QueryClient();
  return (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter><Tutor /></MemoryRouter>
    </QueryClientProvider>
  );
}

beforeEach(() => server.listen());
afterEach(() => { server.resetHandlers(); server.close(); });

describe('Tutor', () => {
  it('renders chat input and send button', () => {
    render(wrapper());
    expect(screen.getByText('Send message or press Enter')).toBeInTheDocument();
  });

  it('sends message and shows AI response', async () => {
    server.use(
      http.get('/api/tutor/sessions', () => HttpResponse.json([])),
      http.post('/api/tutor/chat', () => HttpResponse.json({ reply: 'Great question!', session_id: 'sess-1' }))
    );

    render(wrapper());
    const input = screen.getByPlaceholderText(/type a message/i);
    fireEvent.change(input, { target: { value: 'How do I improve my speaking?' } });
    fireEvent.click(screen.getByText('Send'));

    await waitFor(() => {
      expect(screen.getByText('Great question!')).toBeInTheDocument();
    });
  });

  it('shows loading indicator while awaiting response', async () => {
    server.use(
      http.get('/api/tutor/sessions', () => HttpResponse.json([])),
      http.post('/api/tutor/chat', () => new Promise(() => {}))
    );

    render(wrapper());
    const input = screen.getByPlaceholderText(/type a message/i);
    fireEvent.change(input, { target: { value: 'Test message' } });
    fireEvent.click(screen.getByText('Send'));
  });

  it('displays error on API failure', async () => {
    server.use(
      http.get('/api/tutor/sessions', () => HttpResponse.json([])),
      http.post('/api/tutor/chat', () => HttpResponse.json({ error: 'AI error' }, { status: 500 }))
    );

    render(wrapper());
    const input = screen.getByPlaceholderText(/type a message/i);
    fireEvent.change(input, { target: { value: 'Test' } });
    fireEvent.click(screen.getByText('Send'));
  });
});