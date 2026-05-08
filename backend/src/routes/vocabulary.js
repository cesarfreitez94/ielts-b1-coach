import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { pool } from '../db/pool.js';
import { checkAndAwardAchievements } from './gamification.js';

const router = Router();
router.use(requireAuth);

const LEVEL_ORDER = ['A1', 'A2', 'B1'];

function getUnlockedLevels(currentLevel) {
  const idx = LEVEL_ORDER.indexOf(currentLevel);
  if (idx < 0) return ['A1'];
  return LEVEL_ORDER.slice(0, idx + 1);
}

router.get('/due', async (req, res) => {
  const { level } = req.query;

  const { rows: statsRows } = await pool.query(
    'SELECT current_level FROM user_stats WHERE user_id = $1', [req.user.id]
  );
  const currentLevel = statsRows[0]?.current_level || 'A1';
  const unlockedLevels = getUnlockedLevels(currentLevel);

  const placeholders = unlockedLevels.map((_, i) => `$${i + 1}`).join(', ');
  const params = [...unlockedLevels];

  let query = `
    SELECT v.*, uv.ease_factor, uv.repetitions, uv.status, uv.times_seen, uv.times_correct
    FROM vocabulary v
    LEFT JOIN user_vocabulary uv ON uv.vocab_id = v.id AND uv.user_id = $${params.length + 1}
    WHERE v.level IN (${placeholders})
      AND (uv.next_review IS NULL OR uv.next_review <= CURRENT_DATE)
  `;

  if (level && unlockedLevels.includes(level)) {
    params.push(level);
    query += ` AND v.level = $${params.length}`;
  }

  query += ` ORDER BY uv.next_review ASC NULLS FIRST LIMIT 30`;

  const { rows } = await pool.query(query, [...params, req.user.id]);
  res.json(rows);
});

router.post('/answer', async (req, res) => {
  const { vocab_id, quality } = req.body;
  const userId = req.user.id;

  const { rows: existing } = await pool.query(
    'SELECT * FROM user_vocabulary WHERE user_id = $1 AND vocab_id = $2',
    [userId, vocab_id]
  );

  let { ease_factor = 2.5, interval_days = 1, repetitions = 0 } = existing[0] || {};

  if (quality >= 3) {
    if (repetitions === 0) interval_days = 1;
    else if (repetitions === 1) interval_days = 6;
    else interval_days = Math.round(interval_days * ease_factor);
    repetitions++;
  } else {
    repetitions = 0;
    interval_days = 1;
  }

  ease_factor = Math.max(1.3, ease_factor + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  const nextReview = new Date();
  nextReview.setDate(nextReview.getDate() + interval_days);

  const status = interval_days >= 21 ? 'mastered' : interval_days >= 7 ? 'review' : 'learning';
  const xp = quality >= 4 ? 10 : quality >= 2 ? 5 : 2;

  await pool.query(`
    INSERT INTO user_vocabulary (user_id, vocab_id, ease_factor, interval_days, repetitions, next_review, last_reviewed, times_seen, times_correct, status)
    VALUES ($1,$2,$3,$4,$5,$6,NOW(),1,$7,$8)
    ON CONFLICT (user_id, vocab_id) DO UPDATE SET
      ease_factor = $3, interval_days = $4, repetitions = $5, next_review = $6,
      last_reviewed = NOW(),
      times_seen = user_vocabulary.times_seen + 1,
      times_correct = user_vocabulary.times_correct + $7,
      status = $8
  `, [userId, vocab_id, ease_factor, interval_days, repetitions, nextReview.toISOString().split('T')[0],
      quality >= 3 ? 1 : 0, status]);

  await pool.query(`
    UPDATE user_stats SET 
      total_xp = total_xp + $1,
      total_words_studied = total_words_studied + 1
    WHERE user_id = $2
  `, [xp, userId]);

  await pool.query(`INSERT INTO xp_transactions (user_id, amount, source) VALUES ($1,$2,'flashcard')`, [userId, xp]);
  await checkAndAwardAchievements(userId);

  res.json({ xp_earned: xp, next_review: nextReview.toISOString().split('T')[0], status });
});

export default router;
