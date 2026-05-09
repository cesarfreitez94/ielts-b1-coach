import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import Login from '../pages/Login';

const server = setupServer();

function wrapper() {
  const queryClient = new QueryClient();
  return (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter><Login /></MemoryRouter>
    </QueryClientProvider>
  );
}

beforeEach(() => server.listen());
afterEach(() => { server.resetHandlers(); server.close(); });

describe('Login', () => {
  it('renders login form by default', () => {
    render(wrapper());
    expect(screen.getByText('IELTS B1 Coach')).toBeInTheDocument();
    expect(screen.getByText('Welcome back')).toBeInTheDocument();
  });

  it('toggles to register mode when clicking create one', async () => {
    render(wrapper());
    const btn = screen.getByText('Create one');
    fireEvent.click(btn);
    expect(screen.getByText('Create your account')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Your name')).toBeInTheDocument();
  });

  it('shows validation errors on empty submit', async () => {
    render(wrapper());
    const form = screen.getByRole('form') || screen.getByTestId('login-form');
    fireEvent.submit(screen.getByRole('button', { name: /sign in/i }));
  });

  it('calls login API with correct credentials', async () => {
    server.use(
      http.post('/api/auth/login', () => HttpResponse.json({ token: 'jwt-token', user: { id: '1', email: 'a@b.com', name: 'Alice' } }))
    );

    render(wrapper());
    await userEvent.type(screen.getByPlaceholderText(/email/i), 'a@b.com');
    await userEvent.type(screen.getByPlaceholderText(/password/i), 'password123');
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.queryByText('Welcome back')).toBeTruthy();
    });
  });
});