import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { pool } from '../db/pool.js';

const router = Router();
router.use(requireAuth);

export async function checkAndAwardAchievements(userId) {
  const { rows: stats } = await pool.query('SELECT * FROM user_stats WHERE user_id = $1', [userId]);
  const s = stats[0];
  if (!s) return;

  const { rows: earned } = await pool.query(
    'SELECT achievement_id FROM user_achievements WHERE user_id = $1', [userId]
  );
  const earnedIds = new Set(earned.map(e => e.achievement_id));

  const { rows: all } = await pool.query('SELECT * FROM achievements');
  const newAchievements = [];

  for (const ach of all) {
    if (earnedIds.has(ach.id)) continue;

    let unlocked = false;
    const v = ach.requirement_value;

    switch (ach.key) {
      case 'first_card': unlocked = s.total_words_studied >= 1; break;
      case 'streak_3': unlocked = s.streak_days >= 3; break;
      case 'streak_7': unlocked = s.streak_days >= 7; break;
      case 'streak_30': unlocked = s.streak_days >= 30; break;
      case 'words_50': unlocked = s.total_words_studied >= 50; break;
      case 'words_200': unlocked = s.total_words_studied >= 200; break;
      case 'words_500': unlocked = s.total_words_studied >= 500; break;
      case 'first_speak': unlocked = s.speaking_sessions >= 1; break;
      case 'speak_10': unlocked = s.speaking_sessions >= 10; break;
      case 'first_write': unlocked = s.writing_submissions >= 1; break;
      case 'level_a2': unlocked = ['A2', 'B1'].includes(s.current_level); break;
      case 'level_b1': unlocked = s.current_level === 'B1'; break;
      case 'hours_50': unlocked = s.total_minutes_studied >= 50 * 60; break;
      case 'hours_250': unlocked = s.total_minutes_studied >= 250 * 60; break;
      case 'hours_500': unlocked = s.total_minutes_studied >= 500 * 60; break;
      case 'perfect_day': {
        const { rows } = await pool.query(
          `SELECT COUNT(*) as done FROM daily_tasks WHERE user_id = $1 AND date = CURRENT_DATE AND completed = true`, [userId]
        );
        const { rows: total } = await pool.query(
          `SELECT COUNT(*) as total FROM daily_tasks WHERE user_id = $1 AND date = CURRENT_DATE`, [userId]
        );
        unlocked = parseInt(rows[0]?.done) >= parseInt(total[0]?.total) && parseInt(total[0]?.total) > 0;
        break;
      }
    }

    if (unlocked) {
      await pool.query(
        'INSERT INTO user_achievements (user_id, achievement_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',
        [userId, ach.id]
      );
      await pool.query(
        'UPDATE user_stats SET total_xp = total_xp + $1 WHERE user_id = $2',
        [ach.xp_reward, userId]
      );
      await pool.query(
        `INSERT INTO xp_transactions (user_id, amount, source, description) VALUES ($1,$2,'achievement',$3)`,
        [userId, ach.xp_reward, `Logro: ${ach.name}`]
      );
      newAchievements.push(ach);
    }
  }
  return newAchievements;
}

router.get('/', async (req, res) => {
  const { rows } = await pool.query(`
    SELECT a.*, ua.earned_at,
      CASE WHEN ua.user_id IS NOT NULL THEN true ELSE false END as earned
    FROM achievements a
    LEFT JOIN user_achievements ua ON ua.achievement_id = a.id AND ua.user_id = $1
    ORDER BY a.category, a.requirement_value
  `, [req.user.id]);
  res.json(rows);
});

router.get('/xp-history', async (req, res) => {
  const { rows } = await pool.query(`
    SELECT * FROM xp_transactions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50
  `, [req.user.id]);
  res.json(rows);
});

router.get('/leaderboard', async (req, res) => {
  // Single user for now, but structured for multi-user
  const { rows } = await pool.query(`
    SELECT u.name, s.total_xp, s.streak_days, s.current_level, s.total_words_studied
    FROM user_stats s JOIN users u ON u.id = s.user_id
    ORDER BY s.total_xp DESC LIMIT 10
  `);
  res.json(rows);
});

export default router;
