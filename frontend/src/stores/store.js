import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useStore = create(
  persist(
    (set, get) => ({
      // Auth
      token: null,
      user: null,
      setAuth: (token, user) => { localStorage.setItem('ielts_token', token); set({ token, user }); },
      logout: () => { localStorage.removeItem('ielts_token'); set({ token: null, user: null }); },

      // Dashboard data (cached)
      dashboard: null,
      setDashboard: (data) => set({ dashboard: data }),

      // Current flashcard session
      cardSession: { cards: [], idx: 0, results: [] },
      setCardSession: (cards) => set({ cardSession: { cards, idx: 0, results: [] } }),
      nextCard: (result) => set((s) => ({
        cardSession: {
          ...s.cardSession,
          idx: s.cardSession.idx + 1,
          results: [...s.cardSession.results, result],
        }
      })),

      // AI Tutor session
      tutorSessionId: null,
      tutorMessages: [],
      setTutorSession: (id) => set({ tutorSessionId: id }),
      addTutorMessage: (msg) => set((s) => ({ tutorMessages: [...s.tutorMessages, msg] })),
      clearTutor: () => set({ tutorSessionId: null, tutorMessages: [] }),

      // Notifications / achievements popup queue
      achievementQueue: [],
      pushAchievement: (ach) => set((s) => ({ achievementQueue: [...s.achievementQueue, ach] })),
      popAchievement: () => set((s) => ({ achievementQueue: s.achievementQueue.slice(1) })),

      // UI
      activeView: 'home',
      setView: (v) => set({ activeView: v }),
    }),
    { name: 'ielts-store', partialize: (s) => ({ token: s.token, user: s.user }) }
  )
);
