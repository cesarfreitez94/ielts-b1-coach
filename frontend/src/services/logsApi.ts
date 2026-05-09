import type { AxiosInstance } from 'axios';
import api from './api';

export const logsAPI = {
  getClientErrors: (params?: { level?: string; from?: string; to?: string; limit?: number; offset?: number }) =>
    (api as AxiosInstance).get('/logs', { params }),
};

export const clientErrorsAPI = {
  submit: (data: { error_type: string; message: string; stack?: string; page?: string; metadata?: Record<string, unknown> }) =>
    (api as AxiosInstance).post('/logs/client-error', data),
};