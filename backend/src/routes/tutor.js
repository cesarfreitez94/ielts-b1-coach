import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth } from '../middleware/auth.js';
import { pool } from '../db/pool.js';
import { llmChat } from '../services/llmService.js';
import { logger } from '../logger.js';

const router = Router();
router.use(requireAuth);

router.post('/chat', async (req, res) => {
  const { message, session_id } = req.body;
  const sid = session_id || uuidv4();

  const { rows: history } = await pool.query(`
    SELECT role, content FROM tutor_conversations 
    WHERE user_id = $1 AND session_id = $2 
    ORDER BY created_at ASC LIMIT 20
  `, [req.user.id, sid]);

  const { rows: statsRows } = await pool.query('SELECT * FROM user_stats WHERE user_id = $1', [req.user.id]);
  const stats = statsRows[0] || {};
  const { rows: evalRows } = await pool.query(`SELECT * FROM progress_evaluations WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`, [req.user.id]);
  const lastEval = evalRows[0];

  const system = `Eres el tutor personal de IELTS de este estudiante. Tu nombre es Coach B1.

CONTEXTO DEL ESTUDIANTE:
- Nivel: ${stats.current_level || 'A1'} | XP: ${stats.total_xp || 0}
- Racha: ${stats.streak_days || 0} días | Palabras aprendidas: ${stats.total_words_studied || 0}
- Horas totales: ${Math.round((stats.total_minutes_studied || 0) / 60 * 10) / 10}h de 500h meta
- Última evaluación: ${lastEval ? `nivel ${lastEval.overall_level}, áreas débiles: ${lastEval.weak_areas?.join(', ')}` : 'sin evaluación aún'}
- Fecha proyectada B1: ${lastEval?.projected_completion_date || 'por calcular'}

INSTRUCCIONES:
- Responde en español siempre, a menos que el ejercicio sea en inglés
- Si ves que el estudiante no está en camino a las 500h, menciónalo con tacto
- Puedes generar planes del día, mini exámenes, explicaciones, correcciones
- Sé motivador pero honesto sobre el progreso
- Máximo 4 párrafos por respuesta`;

  const messages = [
    ...history.map(h => ({ role: h.role, content: h.content })),
    { role: 'user', content: message }
  ];

  try {
    const reply = await llmChat({ userId: req.user.id, messages, system, maxTokens: 1000 });

    await pool.query(`
      INSERT INTO tutor_conversations (user_id, session_id, role, content) VALUES
      ($1,$2,'user',$3), ($1,$2,'assistant',$4)
    `, [req.user.id, sid, message, reply]);

    res.json({ reply, session_id: sid });
  } catch (e) {
    logger.error({ userId: req.user.id, sessionId: sid, messageLength: message?.length, error: e.message, stack: e.stack }, '[tutor/chat] Error');
    res.status(500).json({ error: e.message });
  }
});

router.get('/sessions', async (req, res) => {
  const { rows } = await pool.query(`
    SELECT session_id, MIN(created_at) as started, COUNT(*) as messages
    FROM tutor_conversations WHERE user_id = $1
    GROUP BY session_id ORDER BY started DESC LIMIT 20
  `, [req.user.id]);
  res.json(rows);
});

export default router;
