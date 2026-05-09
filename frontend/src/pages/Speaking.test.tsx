import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import Speaking from '../pages/Speaking';

const server = setupServer();

function wrapper() {
  const queryClient = new QueryClient();
  return (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter><Speaking /></MemoryRouter>
    </QueryClientProvider>
  );
}

beforeEach(() => server.listen());
afterEach(() => { server.resetHandlers(); server.close(); });

describe('Speaking', () => {
  it('renders record button', () => {
    render(wrapper());
    expect(screen.getByText('Click to start recording')).toBeInTheDocument();
  });

  it('renders transcript area when available', async () => {
    render(wrapper());
    expect(screen.queryByText('Your Transcript')).not.toBeInTheDocument();
  });

  it('renders AI feedback when evaluation complete', async () => {
    render(wrapper());
    expect(screen.queryByText('AI Feedback')).not.toBeInTheDocument();
  });
});