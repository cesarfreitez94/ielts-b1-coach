import { pool } from '../db/pool.js';
import { llmChat } from '../services/llmService.js';

// ── Main evaluation function ─────────────────────────────────────
// Called weekly by cron OR on demand by user
export async function runDailyEvaluation(userId) {
  // 1. Gather all user data
  const stats = await getUserFullStats(userId);

  // 2. Ask AI to evaluate
  const evaluation = await aiEvaluate(userId, stats);

  // 3. Save evaluation to DB
  await saveEvaluation(userId, stats, evaluation);

  // 4. Adjust daily goal if needed
  if (evaluation.daily_goal_adjustment !== 0) {
    await pool.query(
      'UPDATE app_config SET daily_goal_minutes = daily_goal_minutes + $1 WHERE user_id = $2',
      [evaluation.daily_goal_adjustment, userId]
    );
  }

  // 5. Update user level if changed
  if (evaluation.overall_level) {
    await pool.query(
      'UPDATE user_stats SET current_level = $1 WHERE user_id = $2',
      [evaluation.overall_level, userId]
    );
  }

  return evaluation;
}

async function getUserFullStats(userId) {
  const [statsRes, progressRes, speakingRes, writingRes, vocabRes, configRes] = await Promise.all([
    pool.query('SELECT * FROM user_stats WHERE user_id = $1', [userId]),
    pool.query(`
      SELECT 
        SUM(minutes_study + minutes_speaking + minutes_listening + minutes_writing + minutes_ai_tutor) as total_minutes,
        COUNT(*) as active_days,
        AVG(xp_earned) as avg_daily_xp
      FROM daily_progress 
      WHERE user_id = $1 AND date >= NOW() - INTERVAL '30 days'
    `, [userId]),
    pool.query(`
      SELECT AVG(overall_score) as avg_score, COUNT(*) as sessions, AVG(fluency_score) as avg_fluency
      FROM speaking_sessions WHERE user_id = $1
    `, [userId]),
    pool.query(`
      SELECT AVG(overall_score) as avg_score, COUNT(*) as submissions
      FROM writing_sessions WHERE user_id = $1
    `, [userId]),
    pool.query(`
      SELECT 
        COUNT(*) FILTER (WHERE status = 'mastered') as mastered,
        COUNT(*) as total_seen
      FROM user_vocabulary WHERE user_id = $1
    `, [userId]),
    pool.query('SELECT daily_goal_minutes, target_exam_date FROM app_config WHERE user_id = $1', [userId]),
  ]);

  const s = statsRes.rows[0] || {};
  const p = progressRes.rows[0] || {};
  const sp = speakingRes.rows[0] || {};
  const w = writingRes.rows[0] || {};
  const v = vocabRes.rows[0] || {};
  const c = configRes.rows[0] || {};

  const totalHours = (s.total_minutes_studied || 0) / 60;
  const daysActive = s.total_sessions || 0;
  const dailyGoalMin = c.daily_goal_minutes || 180;
  
  // Calculate projected hours to B1 (500h target)
  const avgDailyHours = daysActive > 0 ? totalHours / daysActive : dailyGoalMin / 60;
  const remainingHours = Math.max(0, 500 - totalHours);
  const daysToComplete = avgDailyHours > 0 ? remainingHours / avgDailyHours : 180;
  const projectedDate = new Date();
  projectedDate.setDate(projectedDate.getDate() + daysToComplete);

  return {
    totalHours: Math.round(totalHours * 10) / 10,
    remainingHours: Math.round(remainingHours * 10) / 10,
    daysActive,
    streak: s.streak_days || 0,
    totalXP: s.total_xp || 0,
    currentLevel: s.current_level || 'A1',
    totalWords: s.total_words_studied || 0,
    masteredWords: parseInt(v.mastered) || 0,
    speakingSessions: parseInt(sp.sessions) || 0,
    avgSpeakingScore: parseFloat(sp.avg_score) || 0,
    avgFluency: parseFloat(sp.avg_fluency) || 0,
    writingSubmissions: parseInt(w.submissions) || 0,
    avgWritingScore: parseFloat(w.avg_score) || 0,
    recentActiveDays: parseInt(p.active_days) || 0,
    avgDailyXP: parseFloat(p.avg_daily_xp) || 0,
    projectedCompletionDate: projectedDate.toISOString().split('T')[0],
    dailyGoalMinutes: dailyGoalMin,
    targetExamDate: c.target_exam_date,
    onTrack: daysToComplete <= 180,
    avgDailyHours: Math.round(avgDailyHours * 10) / 10,
    dailyHoursNeeded: Math.round((remainingHours / Math.max(1, daysToComplete)) * 10) / 10,
  };
}

async function aiEvaluate(userId, stats) {
  const prompt = `
Eres el agente evaluador de progreso de un estudiante de inglés IELTS B1.

DATOS DEL ESTUDIANTE:
- Nivel actual: ${stats.currentLevel}
- Total XP: ${stats.totalXP}
- Horas estudiadas: ${stats.totalHours}h de 500h necesarias
- Horas restantes: ${stats.remainingHours}h
- Días activos: ${stats.daysActive}
- Racha actual: ${stats.streak} días
- Palabras dominadas: ${stats.masteredWords} / ${stats.totalWords} vistas
- Sesiones de speaking: ${stats.speakingSessions} (score promedio: ${stats.avgSpeakingScore.toFixed(1)}/10)
- Submissions de writing: ${stats.writingSubmissions} (score promedio: ${stats.avgWritingScore.toFixed(1)}/10)
- Días activos últimos 30 días: ${stats.recentActiveDays}
- Promedio horas/día: ${stats.avgDailyHours}h
- Horas/día necesarias para llegar a tiempo: ${stats.dailyHoursNeeded}h
- Fecha proyectada de completar 500h: ${stats.projectedCompletionDate}
- Meta del examen: ${stats.targetExamDate || 'No definida'}
- Goal diario actual: ${stats.dailyGoalMinutes} minutos

RESPONDE EXACTAMENTE en este JSON (sin markdown, sin explicaciones extra):
{
  "overall_level": "A1|A2|B1",
  "on_track": true|false,
  "vocabulary_score": 1-10,
  "grammar_score": 1-10,
  "speaking_score": 1-10,
  "writing_score": 1-10,
  "listening_score": 1-10,
  "weak_areas": ["area1", "area2"],
  "recommended_focus": "qué debe priorizar esta semana en 1-2 frases",
  "daily_goal_adjustment": -30|0|30|60,
  "hours_needed_for_b1": número_decimal,
  "projected_completion_date": "YYYY-MM-DD",
  "urgency_level": "ok|warning|critical",
  "full_report": "reporte detallado de 3-4 párrafos en español, motivador pero honesto, con análisis específico del progreso y recomendaciones concretas para la próxima semana",
  "daily_plan_suggestion": "plan sugerido del día en formato: Mañana(Xmin): actividad. Tarde(Xmin): actividad. Noche(Xmin): actividad."
}`;

  const raw = await llmChat({
    userId,
    messages: [{ role: 'user', content: prompt }],
    system: 'Eres un agente evaluador de aprendizaje de idiomas. Responde SOLO con JSON válido.',
    maxTokens: 1500,
  });

  try {
    return JSON.parse(raw.trim());
  } catch {
    // Fallback if JSON parse fails
    return {
      overall_level: stats.currentLevel,
      on_track: stats.onTrack,
      vocabulary_score: 5, grammar_score: 5, speaking_score: 5,
      writing_score: 5, listening_score: 5,
      weak_areas: ['speaking'],
      recommended_focus: 'Practica speaking y vocabulario esta semana.',
      daily_goal_adjustment: 0,
      hours_needed_for_b1: stats.remainingHours,
      projected_completion_date: stats.projectedCompletionDate,
      urgency_level: stats.onTrack ? 'ok' : 'warning',
      full_report: raw,
      daily_plan_suggestion: 'Mañana(60min): Flashcards + gramática. Tarde(60min): Podcast + lectura. Noche(60min): Speaking + writing.',
    };
  }
}

async function saveEvaluation(userId, stats, evaluation) {
  await pool.query(`
    INSERT INTO progress_evaluations 
    (user_id, total_hours_so_far, hours_needed_for_b1, projected_completion_date, on_track,
     vocabulary_score, grammar_score, speaking_score, writing_score, listening_score,
     overall_level, weak_areas, recommended_focus, full_report, daily_goal_adjustment)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
  `, [
    userId, stats.totalHours, evaluation.hours_needed_for_b1,
    evaluation.projected_completion_date, evaluation.on_track,
    evaluation.vocabulary_score, evaluation.grammar_score, evaluation.speaking_score,
    evaluation.writing_score, evaluation.listening_score,
    evaluation.overall_level, evaluation.weak_areas, evaluation.recommended_focus,
    evaluation.full_report, evaluation.daily_goal_adjustment,
  ]);
}
