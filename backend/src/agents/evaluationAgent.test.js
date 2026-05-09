import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../db/pool.js', () => ({
  pool: { query: vi.fn() },
}));
vi.mock('../logger.js', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn(), child: vi.fn(() => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() })) },
}));

const mockPool = await import('../db/pool.js').then(m => m.pool);
const mockLlmservice = await import('../services/llmService.js').then(m => m.llmChat);

describe('evaluationAgent', () => {
  const { runDailyEvaluation } = await import('../agents/evaluationAgent.js');

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.KIMI_API_KEY = 'test-key';
    process.env.ENCRYPTION_KEY = 'test-encryption-key-that-is-at-least-30-chars!';
  });

  it('aggregates stats and runs AI evaluation', async () => {
    mockPool.query
      .mockResolvedValueOnce({ rows: [{ id: 'user-1', total_xp: 500, current_level: 'A2', total_minutes_studied: 3000, streak_days: 7, total_words_studied: 100, speaking_sessions: 5, writing_submissions: 3 }] })
      .mockResolvedValueOnce({ rows: [{ total_minutes: 3000, active_days: 20, avg_daily_xp: 25 }] })
      .mockResolvedValueOnce({ rows: [{ avg_score: 6.5, sessions: 5, avg_fluency: 6 }] })
      .mockResolvedValueOnce({ rows: [{ avg_score: 6, submissions: 3 }] })
      .mockResolvedValueOnce({ rows: [{ mastered: 50, total_seen: 100 }] })
      .mockResolvedValueOnce({ rows: [{ daily_goal_minutes: 180, target_exam_date: '2025-12-01' }] })
      .mockResolvedValueOnce({ rows: [] });

    mockLlmservice.mockResolvedValue(JSON.stringify({
      overall_level: 'A2', on_track: true, vocabulary_score: 6, grammar_score: 5, speaking_score: 6,
      writing_score: 5, listening_score: 5, weak_areas: ['grammar'], recommended_focus: 'More grammar',
      daily_goal_adjustment: 0, hours_needed_for_b1: 450, projected_completion_date: '2025-12-31',
      urgency_level: 'ok', full_report: 'Good progress', daily_plan_suggestion: 'Morning: Grammar',
    }));

    const result = await runDailyEvaluation('user-1');

    expect(result.overall_level).toBe('A2');
    expect(mockLlmservice).toHaveBeenCalled();
  });

  it('adjusts daily goal when evaluation says so', async () => {
    mockPool.query
      .mockResolvedValueOnce({ rows: [{ id: 'user-1', total_xp: 200, current_level: 'A1', total_minutes_studied: 1000, streak_days: 2, total_words_studied: 20, speaking_sessions: 1, writing_submissions: 0 }] })
      .mockResolvedValueOnce({ rows: [{ total_minutes: 1000, active_days: 5, avg_daily_xp: 10 }] })
      .mockResolvedValueOnce({ rows: [{ avg_score: 4, sessions: 1, avg_fluency: 4 }] })
      .mockResolvedValueOnce({ rows: [{ avg_score: 0, submissions: 0 }] })
      .mockResolvedValueOnce({ rows: [{ mastered: 5, total_seen: 20 }] })
      .mockResolvedValueOnce({ rows: [{ daily_goal_minutes: 120, target_exam_date: null }] })
      .mockResolvedValueOnce({ rows: [] });

    mockLlmservice.mockResolvedValue(JSON.stringify({
      overall_level: 'A1', on_track: false, vocabulary_score: 4, grammar_score: 3, speaking_score: 4,
      writing_score: 3, listening_score: 4, weak_areas: ['vocabulary', 'writing'],
      recommended_focus: 'Increase daily goal', daily_goal_adjustment: 30, hours_needed_for_b1: 480,
      projected_completion_date: '2026-06-01', urgency_level: 'warning',
      full_report: 'Need more practice', daily_plan_suggestion: 'More reading',
    }));

    await runDailyEvaluation('user-1');

    const adjustCall = mockPool.query.mock.calls.find(c => typeof c[0] === 'string' && c[0].includes('UPDATE app_config'));
    expect(adjustCall).toBeDefined();
  });

  it('updates user level when evaluation changes it', async () => {
    mockPool.query
      .mockResolvedValueOnce({ rows: [{ id: 'user-1', total_xp: 800, current_level: 'A2', total_minutes_studied: 5000, streak_days: 14, total_words_studied: 200, speaking_sessions: 10, writing_submissions: 5 }] })
      .mockResolvedValueOnce({ rows: [{ total_minutes: 5000, active_days: 30, avg_daily_xp: 27 }] })
      .mockResolvedValueOnce({ rows: [{ avg_score: 7, sessions: 10, avg_fluency: 7 }] })
      .mockResolvedValueOnce({ rows: [{ avg_score: 7, submissions: 5 }] })
      .mockResolvedValueOnce({ rows: [{ mastered: 100, total_seen: 200 }] })
      .mockResolvedValueOnce({ rows: [{ daily_goal_minutes: 180, target_exam_date: null }] })
      .mockResolvedValueOnce({ rows: [] });

    mockLlmservice.mockResolvedValue(JSON.stringify({
      overall_level: 'B1', on_track: true, vocabulary_score: 7, grammar_score: 6, speaking_score: 7,
      writing_score: 6, listening_score: 7, weak_areas: [], recommended_focus: 'Maintain level',
      daily_goal_adjustment: 0, hours_needed_for_b1: 200, projected_completion_date: '2025-09-01',
      urgency_level: 'ok', full_report: 'Excellent', daily_plan_suggestion: 'Keep going',
    }));

    await runDailyEvaluation('user-1');

    const levelCall = mockPool.query.mock.calls.find(c => typeof c[0] === 'string' && c[0].includes('UPDATE user_stats'));
    expect(levelCall).toBeDefined();
  });

  it('falls back to defaults when JSON parse fails', async () => {
    mockPool.query
      .mockResolvedValueOnce({ rows: [{ id: 'user-1', total_xp: 100, current_level: 'A1', total_minutes_studied: 500, streak_days: 1, total_words_studied: 10, speaking_sessions: 0, writing_submissions: 0 }] })
      .mockResolvedValueOnce({ rows: [{ total_minutes: 500, active_days: 3, avg_daily_xp: 8 }] })
      .mockResolvedValueOnce({ rows: [{ avg_score: null, sessions: 0, avg_fluency: null }] })
      .mockResolvedValueOnce({ rows: [{ avg_score: null, submissions: 0 }] })
      .mockResolvedValueOnce({ rows: [{ mastered: 0, total_seen: 10 }] })
      .mockResolvedValueOnce({ rows: [{ daily_goal_minutes: 120, target_exam_date: null }] })
      .mockResolvedValueOnce({ rows: [] });

    mockLlmservice.mockResolvedValue('Not valid JSON response from AI');

    const result = await runDailyEvaluation('user-1');

    expect(result.overall_level).toBe('A1');
    expect(result.urgency_level).toBe('warning');
  });
});