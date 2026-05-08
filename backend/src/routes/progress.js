import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { pool } from '../db/pool.js';
import { checkAndAwardAchievements } from './gamification.js';

const router = Router();
router.use(requireAuth);

router.get('/dashboard', async (req, res) => {
  const [statsRes, todayRes, evalRes, tasksRes, achievementsRes] = await Promise.all([
    pool.query('SELECT * FROM user_stats WHERE user_id = $1', [req.user.id]),
    pool.query('SELECT * FROM daily_progress WHERE user_id = $1 AND date = CURRENT_DATE', [req.user.id]),
    pool.query('SELECT * FROM progress_evaluations WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1', [req.user.id]),
    pool.query('SELECT * FROM daily_tasks WHERE user_id = $1 AND date = CURRENT_DATE ORDER BY task_key', [req.user.id]),
    pool.query(`SELECT a.*, ua.earned_at FROM user_achievements ua JOIN achievements a ON a.id = ua.achievement_id WHERE ua.user_id = $1 ORDER BY ua.earned_at DESC LIMIT 5`, [req.user.id]),
  ]);

  const stats = statsRes.rows[0] || {};
  const totalHours = (stats.total_minutes_studied || 0) / 60;
  const pct500 = Math.min(100, Math.round(totalHours / 500 * 100 * 10) / 10);

  res.json({
    stats,
    today: todayRes.rows[0] || {},
    lastEvaluation: evalRes.rows[0] || null,
    tasks: tasksRes.rows,
    recentAchievements: achievementsRes.rows,
    hoursProgress: { total: Math.round(totalHours * 10) / 10, target: 500, pct: pct500 },
  });
});

router.post('/log-time', async (req, res) => {
  const { type, minutes } = req.body;
  const allowed = ['study', 'speaking', 'listening', 'writing', 'ai_tutor'];
  if (!allowed.includes(type)) return res.status(400).json({ error: 'Invalid type' });

  const col = `minutes_${type}`;
  await pool.query(`
    INSERT INTO daily_progress (user_id, date, ${col})
    VALUES ($1, CURRENT_DATE, $2)
    ON CONFLICT (user_id, date) DO UPDATE SET ${col} = daily_progress.${col} + $2
  `, [req.user.id, minutes]);

  await pool.query(`
    UPDATE user_stats SET total_minutes_studied = total_minutes_studied + $1 WHERE user_id = $2
  `, [minutes, req.user.id]);

  res.json({ success: true });
});

router.post('/complete-task', async (req, res) => {
  const { task_key } = req.body;
  const { rows } = await pool.query(`
    UPDATE daily_tasks SET completed = true, completed_at = NOW()
    WHERE user_id = $1 AND date = CURRENT_DATE AND task_key = $2 AND completed = false
    RETURNING xp_reward
  `, [req.user.id, task_key]);

  if (!rows[0]) return res.json({ already_done: true });
  const xp = rows[0].xp_reward;

  await pool.query(`UPDATE user_stats SET total_xp = total_xp + $1, tasks_completed = tasks_completed + 1 WHERE user_id = $2`, [xp, req.user.id]);
  await pool.query(`INSERT INTO xp_transactions (user_id, amount, source) VALUES ($1,$2,'task_complete')`, [req.user.id, xp]);

  await checkAndAwardAchievements(req.user.id);
  res.json({ xp_earned: xp });
});

router.get('/history', async (req, res) => {
  const { rows } = await pool.query(`
    SELECT date, 
      minutes_study + minutes_speaking + minutes_listening + minutes_writing + minutes_ai_tutor as total_minutes,
      xp_earned, tasks_completed
    FROM daily_progress WHERE user_id = $1 ORDER BY date DESC LIMIT 30
  `, [req.user.id]);
  res.json(rows);
});

export default router;
