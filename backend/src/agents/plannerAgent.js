import { pool } from '../db/pool.js';
import { llmChat } from '../services/llmService.js';

// ── Generate personalized daily tasks ───────────────────────────
export async function generateDailyTasks(userId) {
  const today = new Date().toISOString().split('T')[0];

  // Check if already generated today
  const existing = await pool.query(
    'SELECT id FROM daily_tasks WHERE user_id = $1 AND date = $2 LIMIT 1',
    [userId, today]
  );
  if (existing.rows.length > 0) return;

  // Get user stats for personalization
  const [statsRes, lastEvalRes, configRes] = await Promise.all([
    pool.query('SELECT * FROM user_stats WHERE user_id = $1', [userId]),
    pool.query(`
      SELECT * FROM progress_evaluations 
      WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1
    `, [userId]),
    pool.query('SELECT daily_goal_minutes FROM app_config WHERE user_id = $1', [userId]),
  ]);

  const stats = statsRes.rows[0] || {};
  const lastEval = lastEvalRes.rows[0];
  const goalMinutes = configRes.rows[0]?.daily_goal_minutes || 180;
  const level = stats.current_level || 'A1';
  const weakAreas = lastEval?.weak_areas || [];

  const prompt = `
Genera el plan de tareas diarias para un estudiante de inglés IELTS.

PERFIL:
- Nivel: ${level}
- XP total: ${stats.total_xp || 0}
- Racha: ${stats.streak_days || 0} días
- Meta diaria: ${goalMinutes} minutos
- Áreas débiles: ${weakAreas.join(', ') || 'ninguna identificada aún'}
- Última recomendación: ${lastEval?.recommended_focus || 'Empezar con fundamentos'}

GENERA exactamente 5 tareas en JSON array. Cada tarea debe sumar máximo ${goalMinutes} minutos total.
Prioriza las áreas débiles. Varía las tareas cada día (no siempre las mismas).

[
  {
    "task_key": "flash|grammar|speak|listen|write",
    "task_name": "Nombre descriptivo de la tarea",
    "target_minutes": número,
    "xp_reward": número,
    "ai_context": "instrucción específica de qué practicar hoy"
  }
]

Responde SOLO con el JSON array.`;

  let tasks;
  try {
    const raw = await llmChat({
      userId,
      messages: [{ role: 'user', content: prompt }],
      system: 'Eres un planificador de aprendizaje de idiomas. Responde SOLO con JSON válido.',
      maxTokens: 800,
    });
    tasks = JSON.parse(raw.trim().replace(/```json|```/g, ''));
  } catch {
    // Fallback default tasks
    tasks = [
      { task_key: 'flash', task_name: '20 flashcards de vocabulario', target_minutes: 20, xp_reward: 30, ai_context: `Nivel ${level} — vocabulario esencial` },
      { task_key: 'grammar', task_name: 'Ejercicio de gramática', target_minutes: 20, xp_reward: 25, ai_context: `Practica los tiempos verbales de ${level}` },
      { task_key: 'speak', task_name: 'Sesión de speaking 10 min', target_minutes: 10, xp_reward: 35, ai_context: 'Describe tu día o un tema libre' },
      { task_key: 'listen', task_name: 'Escucha input en inglés', target_minutes: 60, xp_reward: 20, ai_context: 'BBC Learning English o serie con subtítulos EN' },
      { task_key: 'write', task_name: 'Writing: 80 palabras', target_minutes: 20, xp_reward: 30, ai_context: 'Describe tu rutina diaria' },
    ];
  }

  // Insert tasks to DB
  for (const t of tasks) {
    await pool.query(`
      INSERT INTO daily_tasks (user_id, date, task_key, task_name, target_minutes, xp_reward, ai_generated, ai_context)
      VALUES ($1, $2, $3, $4, $5, $6, true, $7)
      ON CONFLICT (user_id, date, task_key) DO NOTHING
    `, [userId, today, t.task_key, t.task_name, t.target_minutes, t.xp_reward, t.ai_context]);
  }

  return tasks;
}
