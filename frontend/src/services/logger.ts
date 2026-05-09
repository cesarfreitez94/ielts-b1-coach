import api from './api';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  page?: string;
  error_type?: string;
  metadata?: Record<string, unknown>;
  timestamp: string;
}

const LOG_BUFFER_KEY = 'ielts_error_buffer';
const MAX_BUFFER_SIZE = 20;

class ClientLogger {
  private buffer: LogEntry[] = [];
  private flushTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.loadFromStorage();
    this.startFlushTimer();
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.flush());
    }
  }

  private loadFromStorage() {
    try {
      const stored = localStorage.getItem(LOG_BUFFER_KEY);
      if (stored) {
        this.buffer = JSON.parse(stored);
      }
    } catch {
      this.buffer = [];
    }
  }

  private saveToStorage() {
    try {
      localStorage.setItem(LOG_BUFFER_KEY, JSON.stringify(this.buffer.slice(-MAX_BUFFER_SIZE)));
    } catch {
    }
  }

  private startFlushTimer() {
    if (this.flushTimer) return;
    this.flushTimer = setInterval(() => this.flush(), 5000);
  }

  private async sendToServer(entry: LogEntry) {
    try {
      await api.post('/logs/client-error', {
        error_type: entry.level,
        message: entry.message,
        page: entry.page,
        metadata: entry.metadata,
      });
      return true;
    } catch {
      return false;
    }
  }

  async flush() {
    if (this.buffer.length === 0) return;
    const entries = [...this.buffer];
    this.buffer = [];
    localStorage.removeItem(LOG_BUFFER_KEY);

    const results = await Promise.allSettled(entries.map(e => this.sendToServer(e)));
    const failedCount = results.filter(r => r.status === 'rejected' || !(r.value as boolean)).length;
    if (failedCount > 0) {
      this.buffer = entries.slice(-failedCount);
      this.saveToStorage();
    }
  }

  log(level: LogLevel, message: string, metadata?: Record<string, unknown>) {
    const entry: LogEntry = {
      level,
      message,
      page: typeof window !== 'undefined' ? window.location.pathname : undefined,
      metadata,
      timestamp: new Date().toISOString(),
    };

    if (level === 'error' || level === 'warn') {
      this.buffer.push(entry);
      this.saveToStorage();
      if (navigator.onLine) this.flush();
    }
  }

  error(message: string, metadata?: Record<string, unknown>) {
    this.log('error', message, metadata);
  }

  warn(message: string, metadata?: Record<string, unknown>) {
    this.log('warn', message, metadata);
  }

  info(message: string, metadata?: Record<string, unknown>) {
    this.log('info', message, metadata);
  }

  debug(message: string, metadata?: Record<string, unknown>) {
    this.log('debug', message, metadata);
  }

  captureError(error: Error, context?: Record<string, unknown>) {
    this.error(error.message, {
      stack: error.stack,
      name: error.name,
      ...context,
    });
  }
}

export const clientLogger = new ClientLogger();
export default clientLogger;