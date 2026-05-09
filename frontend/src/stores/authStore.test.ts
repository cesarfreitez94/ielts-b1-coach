import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAuthStore } from './authStore';

describe('authStore', () => {
  beforeEach(() => {
    localStorage.clear();
    const { result } = renderHook(() => useAuthStore());
    act(() => { result.current.logout(); });
  });

  it('sets auth token and user', () => {
    const { result } = renderHook(() => useAuthStore());

    act(() => {
      result.current.setAuth('test-token', { id: 'user-1', email: 'test@example.com', name: 'Test' });
    });

    expect(result.current.token).toBe('test-token');
    expect(result.current.user?.email).toBe('test@example.com');
    expect(localStorage.getItem('ielts_token')).toBe('test-token');
  });

  it('persists token to localStorage', () => {
    const { result } = renderHook(() => useAuthStore());

    act(() => {
      result.current.setAuth('persisted-token', { id: 'user-2', email: 'user@example.com', name: 'User' });
    });

    expect(localStorage.getItem('ielts_token')).toBe('persisted-token');
  });

  it('logout clears token and user', () => {
    const { result } = renderHook(() => useAuthStore());

    act(() => {
      result.current.setAuth('test-token', { id: 'user-1', email: 'test@example.com', name: 'Test' });
    });

    act(() => {
      result.current.logout();
    });

    expect(result.current.token).toBeNull();
    expect(result.current.user).toBeNull();
    expect(localStorage.getItem('ielts_token')).toBeNull();
  });

  it('restores state from localStorage on init', () => {
    localStorage.setItem('ielts_token', 'restored-token');
    const initial = useAuthStore.getState();
    expect(initial.token).toBe('restored-token');
  });
});