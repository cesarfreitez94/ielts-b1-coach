import type { AxiosResponse, AxiosInstance } from 'axios';

declare module '../services/api' {
  export const authAPI: {
    login: (email: string, password: string) => Promise<AxiosResponse>;
    register: (email: string, password: string, name: string) => Promise<AxiosResponse>;
  };
  export const configAPI: {
    get: () => Promise<AxiosResponse>;
    update: (data: Record<string, unknown>) => Promise<AxiosResponse>;
    test: (service: string) => Promise<AxiosResponse>;
  };
  export const progressAPI: {
    dashboard: () => Promise<AxiosResponse>;
    history: () => Promise<AxiosResponse>;
    logTime: (type: string, minutes: number) => Promise<AxiosResponse>;
    completeTask: (task_key: string) => Promise<AxiosResponse>;
  };
  export const vocabAPI: {
    getDue: (level?: string) => Promise<AxiosResponse>;
    answer: (vocab_id: number, quality: number) => Promise<AxiosResponse>;
  };
  export const speakingAPI: {
    transcribe: (audioBlob: Blob) => Promise<AxiosResponse>;
    evaluate: (data: Record<string, unknown>) => Promise<AxiosResponse>;
    getTTSUrl: (text: string) => string;
  };
  export const writingAPI: {
    evaluate: (user_text: string, prompt_text: string) => Promise<AxiosResponse>;
  };
  export const tutorAPI: {
    chat: (message: string, session_id?: string) => Promise<AxiosResponse>;
    sessions: () => Promise<AxiosResponse>;
  };
  export const gamificationAPI: {
    achievements: () => Promise<AxiosResponse>;
    xpHistory: () => Promise<AxiosResponse>;
    leaderboard: () => Promise<AxiosResponse>;
  };
  export const evaluationAPI: {
    run: () => Promise<AxiosResponse>;
    latest: () => Promise<AxiosResponse>;
    history: () => Promise<AxiosResponse>;
  };
  const api: AxiosInstance;
  export default api;
}