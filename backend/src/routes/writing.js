import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { pool } from '../db/pool.js';
import { llmChat } from '../services/llmService.js';
import { checkAndAwardAchievements } from './gamification.js';

const router = Router();
router.use(requireAuth);

router.post('/evaluate', async (req, res) => {
  const { user_text, prompt_text } = req.body;
  const wordCount = user_text.trim().split(/\s+/).length;

  const raw = await llmChat({
    userId: req.user.id,
    messages: [{ role: 'user', content: `
Prompt IELTS: "${prompt_text}"
Texto del estudiante (${wordCount} palabras): "${user_text}"

Evalúa como examinador IELTS. Responde SOLO en JSON:
{
  "grammar_score": 1-10,
  "vocabulary_score": 1-10,
  "coherence_score": 1-10,
  "overall_score": 1-10,
  "estimated_level": "A1|A2|B1",
  "feedback_es": "feedback detallado en español con ejemplos específicos",
  "corrected_version": "versión mejorada del texto",
  "grammar_errors": ["error1: corrección", "error2: corrección"]
}` }],
    system: 'Eres examinador IELTS. Responde SOLO JSON válido.',
    maxTokens: 1200,
  }).catch(() => null);

  if (!raw) return res.status(500).json({ error: 'LLM error' });

  try {
    const ev = JSON.parse(raw.trim());
    const xp = Math.round(ev.overall_score * 4);
    await pool.query(`
      INSERT INTO writing_sessions (user_id, prompt_text, user_text, word_count, ai_feedback, corrected_version,
        grammar_score, vocabulary_score, coherence_score, overall_score, estimated_level, xp_earned)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
    `, [req.user.id, prompt_text, user_text, wordCount, ev.feedback_es, ev.corrected_version,
        ev.grammar_score, ev.vocabulary_score, ev.coherence_score, ev.overall_score, ev.estimated_level, xp]);

    await pool.query(`UPDATE user_stats SET total_xp = total_xp + $1, writing_submissions = writing_submissions + 1 WHERE user_id = $2`, [xp, req.user.id]);
    await checkAndAwardAchievements(req.user.id);
    res.json({ ...ev, xp_earned: xp });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
