import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../db/pool.js', () => ({
  pool: { query: vi.fn() },
}));
vi.mock('../logger.js', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn(), child: vi.fn(() => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() })) },
}));

const mockPool = await import('../db/pool.js').then(m => m.pool);
const mockLlmservice = await import('../services/llmService.js').then(m => m.llmChat);

describe('plannerAgent', () => {
  const { generateDailyTasks } = await import('../agents/plannerAgent.js');

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.KIMI_API_KEY = 'test-key';
    process.env.ENCRYPTION_KEY = 'test-encryption-key-that-is-at-least-30-chars!';
  });

  it('does not regenerate tasks if already exist for today', async () => {
    mockPool.query.mockResolvedValueOnce({ rows: [{ id: 'existing-task-id' }] });

    await generateDailyTasks('user-1');

    expect(mockLlmservice).not.toHaveBeenCalled();
  });

  it('generates tasks using LLM and saves to DB', async () => {
    mockPool.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ current_level: 'A1', total_xp: 100, streak_days: 3 }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ daily_goal_minutes: 180 }] })
      .mockResolvedValueOnce({ rows: [] });

    const tasks = [
      { task_key: 'flash', task_name: 'Vocabulary', target_minutes: 20, xp_reward: 30, ai_context: 'Practice' },
      { task_key: 'speak', task_name: 'Speaking', target_minutes: 10, xp_reward: 35, ai_context: 'Free talk' },
    ];
    mockLlmservice.mockResolvedValue(JSON.stringify(tasks));

    const result = await generateDailyTasks('user-1');

    expect(mockLlmservice).toHaveBeenCalled();
    expect(result).toHaveLength(2);
  });

  it('falls back to default tasks when LLM fails', async () => {
    mockPool.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ current_level: 'A1', total_xp: 0, streak_days: 0 }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ daily_goal_minutes: 180 }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    mockLlmservice.mockRejectedValue(new Error('LLM Error'));

    const result = await generateDailyTasks('user-1');

    expect(result).toHaveLength(5);
    expect(result[0].task_key).toBe('flash');
  });

  it('inserts fallback tasks into database', async () => {
    mockPool.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ current_level: 'A1', total_xp: 0, streak_days: 0 }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ daily_goal_minutes: 180 }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    mockLlmservice.mockRejectedValue(new Error('fail'));

    await generateDailyTasks('user-1');

    const insertCalls = mockPool.query.mock.calls.filter(c => typeof c[0] === 'string' && c[0].includes('INSERT INTO daily_tasks'));
    expect(insertCalls.length).toBeGreaterThan(0);
  });
});