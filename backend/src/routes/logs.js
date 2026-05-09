import { Router } from 'express';
import { pool } from '../db/pool.js';
import { logger } from '../logger.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

router.post('/client-error', async (req, res) => {
  try {
    const {
      error_type,
      message,
      stack,
      page,
      metadata,
    } = req.body;

    const userId = req.user?.id || null;
    const userAgent = req.headers['user-agent'] || null;

    await pool.query(
      `INSERT INTO client_errors (user_id, page, error_type, message, stack, metadata, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [userId, page, error_type, message, stack, metadata ? JSON.stringify(metadata) : null, userAgent]
    );

    logger.warn({ userId, error_type, page }, 'Client error captured');
    res.status(202).json({ received: true });
  } catch (e) {
    logger.error({ err: e }, 'Failed to capture client error');
    res.status(500).json({ error: 'Failed to log error' });
  }
});

router.get('/', async (req, res) => {
  try {
    const { level, source, from, to, limit = 50, offset = 0 } = req.query;
    const conditions = [];
    const params = [];
    let idx = 1;

    if (level) { conditions.push(`error_type = $${idx++}`); params.push(level); }
    if (from) { conditions.push(`created_at >= $${idx++}`); params.push(from); }
    if (to) { conditions.push(`created_at <= $${idx++}`); params.push(to); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    params.push(Number(limit), Number(offset));

    const { rows } = await pool.query(
      `SELECT id, user_id, page, error_type, message, stack, metadata, user_agent, created_at
       FROM client_errors ${where}
       ORDER BY created_at DESC
       LIMIT $${idx++} OFFSET $${idx}`,
      params
    );

    const { rows: [{ count: total }] } = await pool.query(
      `SELECT COUNT(*) as count FROM client_errors ${where}`,
      params.slice(0, -2)
    );

    res.json({ errors: rows, total: Number(total), limit: Number(limit), offset: Number(offset) });
  } catch (e) {
    logger.error({ err: e }, 'Failed to fetch client errors');
    res.status(500).json({ error: 'Failed to fetch errors' });
  }
});

export default router;