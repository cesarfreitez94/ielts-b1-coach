import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  id: string;
  email: string;
  name: string;
  level?: string;
  is_admin?: boolean;
}

interface AuthState {
  token: string | null;
  user: User | null;
  setAuth: (token: string, user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      setAuth: (token, user) => {
        localStorage.setItem('ielts_token', token);
        set({ token, user });
      },
      logout: () => {
        localStorage.removeItem('ielts_token');
        set({ token: null, user: null });
      },
    }),
    { name: 'ielts-auth', partialize: (s) => ({ token: s.token, user: s.user }) }
  )
);