import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { pool } from '../db/pool.js';
import { encryptKey, decryptKey } from '../services/llmService.js';

const router = Router();
router.use(requireAuth);

// GET /api/config — get config (keys masked)
router.get('/', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM app_config WHERE user_id = $1', [req.user.id]);
  const c = rows[0];
  if (!c) return res.json({});
  res.json({
    llm_provider: c.llm_provider,
    llm_model: c.llm_model,
    llm_key_set: !!c.llm_api_key_enc,
    tts_provider: c.tts_provider,
    tts_voice: c.tts_voice,
    tts_key_set: !!c.tts_api_key_enc,
    stt_provider: c.stt_provider,
    stt_key_set: !!c.stt_api_key_enc,
    daily_goal_minutes: c.daily_goal_minutes,
    target_exam_date: c.target_exam_date,
  });
});

// PUT /api/config — update config
router.put('/', async (req, res) => {
  const {
    llm_provider, llm_model, llm_api_key,
    tts_provider, tts_voice, tts_api_key,
    stt_provider, stt_api_key,
    daily_goal_minutes, target_exam_date,
  } = req.body;

  const updates = [];
  const values = [];
  let idx = 1;

  const set = (col, val) => { updates.push(`${col} = $${idx++}`); values.push(val); };

  if (llm_provider) set('llm_provider', llm_provider);
  if (llm_model) set('llm_model', llm_model);
  if (llm_api_key) set('llm_api_key_enc', encryptKey(llm_api_key));
  if (tts_provider) set('tts_provider', tts_provider);
  if (tts_voice) set('tts_voice', tts_voice);
  if (tts_api_key) set('tts_api_key_enc', encryptKey(tts_api_key));
  if (stt_provider) set('stt_provider', stt_provider);
  if (stt_api_key) set('stt_api_key_enc', encryptKey(stt_api_key));
  if (daily_goal_minutes) set('daily_goal_minutes', daily_goal_minutes);
  if (target_exam_date) set('target_exam_date', target_exam_date);

  values.push(req.user.id);
  await pool.query(
    `INSERT INTO app_config (user_id) VALUES ($${idx}) 
     ON CONFLICT (user_id) DO UPDATE SET ${updates.join(', ')}, updated_at = NOW()`,
    values
  );
  res.json({ success: true });
});

// POST /api/config/test — test API keys
router.post('/test', async (req, res) => {
  const { service } = req.body; // llm | tts | stt
  try {
    if (service === 'llm') {
      const { llmChat } = await import('../services/llmService.js');
      const reply = await llmChat({
        userId: req.user.id,
        messages: [{ role: 'user', content: 'Say "OK" in one word.' }],
        maxTokens: 10,
      });
      return res.json({ success: true, response: reply });
    }
    if (service === 'tts') {
      const { textToSpeech } = await import('../services/llmService.js');
      const buf = await textToSpeech({ userId: req.user.id, text: 'Test audio.' });
      return res.json({ success: true, bytes: buf.length });
    }
    res.json({ success: false, error: 'Unknown service' });
  } catch (e) {
    res.json({ success: false, error: e.message });
  }
});

export default router;
