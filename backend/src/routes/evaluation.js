import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { pool } from '../db/pool.js';
import { runDailyEvaluation } from '../agents/evaluationAgent.js';

const router = Router();
router.use(requireAuth);

router.post('/run', async (req, res) => {
  try {
    const result = await runDailyEvaluation(req.user.id);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/latest', async (req, res) => {
  const { rows } = await pool.query(
    'SELECT * FROM progress_evaluations WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
    [req.user.id]
  );
  res.json(rows[0] || null);
});

router.get('/history', async (req, res) => {
  const { rows } = await pool.query(
    'SELECT * FROM progress_evaluations WHERE user_id = $1 ORDER BY created_at DESC LIMIT 12',
    [req.user.id]
  );
  res.json(rows);
});

export default router;
