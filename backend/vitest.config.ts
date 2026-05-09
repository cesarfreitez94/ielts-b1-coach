import { defineConfig } from 'vitest/config';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.test' });

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/tests/setup.js'],
    include: ['src/**/*.test.js'],
    env: {
      JWT_SECRET: 'test-secret-that-is-at-least-64-characters-long-for-testing-purposes-only!!',
      ENCRYPTION_KEY: 'test-encryption-key-that-is-at-least-30-chars!',
      KIMI_API_KEY: 'test-kimi-key',
      DEEPSEEK_API_KEY: 'test-deepseek-key',
      DATABASE_URL: 'postgres://test:test@localhost:5432/test',
      REDIS_URL: 'redis://localhost:6379',
      NODE_ENV: 'test',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.js'],
      exclude: ['src/index.js', 'src/middleware/auth.js'],
    },
  },
});