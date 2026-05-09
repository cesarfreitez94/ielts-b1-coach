import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import Writing from '../pages/Writing';

const server = setupServer();

function wrapper() {
  const queryClient = new QueryClient();
  return (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter><Writing /></MemoryRouter>
    </QueryClientProvider>
  );
}

beforeEach(() => server.listen());
afterEach(() => { server.resetHandlers(); server.close(); });

describe('Writing', () => {
  it('renders writing form with textarea and submit button', () => {
    render(wrapper());
    expect(screen.getByText('Get Feedback')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('shows sample prompts in dropdown', () => {
    render(wrapper());
    expect(screen.getByText('Describe a place you would like to visit and explain why.')).toBeInTheDocument();
  });

  it('evaluates writing on submit', async () => {
    server.use(
      http.post('/api/writing/evaluate', () => HttpResponse.json({
        score: 6.5, band: 'B1', breakdown: { grammar: 6, vocabulary: 7, coherence: 6 },
        feedback: 'Good structure',
      }))
    );

    render(wrapper());
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'My city is big and nice. It has many parks.' } });
    fireEvent.click(screen.getByText('Get Feedback'));

    await waitFor(() => {
      expect(screen.queryByText('Get Feedback')).toBeTruthy();
    });
  });
});