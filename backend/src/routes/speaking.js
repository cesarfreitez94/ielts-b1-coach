import { Router } from 'express';
import multer from 'multer';
import { requireAuth } from '../middleware/auth.js';
import { pool } from '../db/pool.js';
import { llmChat, speechToText, textToSpeech } from '../services/llmService.js';
import { checkAndAwardAchievements } from './gamification.js';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });
const router = Router();
router.use(requireAuth);

router.post('/transcribe', upload.single('audio'), async (req, res) => {
  try {
    const text = await speechToText({
      userId: req.user.id,
      audioBuffer: req.file.buffer,
      mimeType: req.file.mimetype,
    });
    res.json({ transcript: text });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/evaluate', async (req, res) => {
  const { transcript, mode, prompt_text, duration_seconds } = req.body;
  const systemPrompt = `Eres un examinador de inglés IELTS experto. Evalúa el inglés hablado del estudiante (nivel A1, meta B1).
Responde SOLO con JSON válido.`;

  const userPrompt = `
Modo: ${mode}
${mode === 'read' ? `Texto original: "${prompt_text}"` : `Prompt dado: "${prompt_text}"`}
Transcripción del estudiante: "${transcript}"

Evalúa y responde en JSON:
{
  "fluency_score": 1-10,
  "grammar_score": 1-10,
  "vocabulary_score": 1-10,
  "overall_score": 1-10,
  "estimated_level": "A1|A2|B1",
  "feedback_es": "feedback detallado en español: positivos, errores, correcciones específicas",
  "corrected_version": "versión mejorada de lo que dijo",
  "one_tip": "un consejo específico para mejorar"
}`;

  try {
    const raw = await llmChat({ userId: req.user.id, messages: [{ role: 'user', content: userPrompt }], system: systemPrompt, maxTokens: 1000 });
    const evaluation = JSON.parse(raw.trim());
    const xp = Math.round(evaluation.overall_score * 5);

    const { rows } = await pool.query(`
      INSERT INTO speaking_sessions 
      (user_id, mode, prompt_text, transcript, duration_seconds, ai_feedback, fluency_score, grammar_score, vocabulary_score, overall_score, estimated_level, xp_earned)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING id
    `, [req.user.id, mode, prompt_text, transcript, duration_seconds,
        evaluation.feedback_es, evaluation.fluency_score, evaluation.grammar_score,
        evaluation.vocabulary_score, evaluation.overall_score, evaluation.estimated_level, xp]);

    await pool.query(`
      UPDATE user_stats SET 
        total_xp = total_xp + $1,
        speaking_sessions = speaking_sessions + 1,
        total_minutes_studied = total_minutes_studied + $2
      WHERE user_id = $3
    `, [xp, Math.round((duration_seconds || 60) / 60), req.user.id]);

    await pool.query(`
      INSERT INTO xp_transactions (user_id, amount, source, description)
      VALUES ($1, $2, 'speaking_session', $3)
    `, [req.user.id, xp, `Speaking ${mode} — score ${evaluation.overall_score}/10`]);

    await checkAndAwardAchievements(req.user.id);
    res.json({ ...evaluation, xp_earned: xp });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/tts', async (req, res) => {
  try {
    const { text } = req.query;
    const audio = await textToSpeech({ userId: req.user.id, text });
    res.set('Content-Type', 'audio/mpeg');
    res.send(audio);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
