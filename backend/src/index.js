import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cron from 'node-cron';
import { createClient } from 'redis';
import dotenv from 'dotenv';
import pinoHttp from 'pino-http';

import { pool } from './db/pool.js';
import { requestIdMiddleware } from './middleware/requestId.js';
import { logger } from './logger.js';
import authRouter from './routes/auth.js';
import configRouter from './routes/config.js';
import progressRouter from './routes/progress.js';
import vocabularyRouter from './routes/vocabulary.js';
import speakingRouter from './routes/speaking.js';
import writingRouter from './routes/writing.js';
import tutorRouter from './routes/tutor.js';
import gamificationRouter from './routes/gamification.js';
import evaluationRouter from './routes/evaluation.js';
import logsRouter from './routes/logs.js';
import { runDailyEvaluation } from './agents/evaluationAgent.js';
import { generateDailyTasks } from './agents/plannerAgent.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// ── Middleware ──────────────────────────────────────────────────
app.use(requestIdMiddleware);
app.use(pinoHttp({ logger }));
app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000', credentials: true }));
app.use(express.json({ limit: '50mb' })); // large for audio
app.use(express.urlencoded({ extended: true }));

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 200 });
app.use('/api/', limiter);

// ── Redis ───────────────────────────────────────────────────────
export const redis = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
redis.on('error', (err) => logger.error({ err }, 'Redis error'));
await redis.connect();
logger.info('Redis connected');

// ── Routes ──────────────────────────────────────────────────────
app.use('/api/auth', authRouter);
app.use('/api/config', configRouter);
app.use('/api/progress', progressRouter);
app.use('/api/vocabulary', vocabularyRouter);
app.use('/api/speaking', speakingRouter);
app.use('/api/writing', writingRouter);
app.use('/api/tutor', tutorRouter);
app.use('/api/gamification', gamificationRouter);
app.use('/api/evaluation', evaluationRouter);
app.use('/api/logs', logsRouter);

app.get('/api/health', (req, res) => res.json({ status: 'ok', ts: new Date() }));

// ── Cron Jobs ───────────────────────────────────────────────────
// Every day at 06:00 — generate today's tasks for all users
cron.schedule('0 6 * * *', async () => {
  logger.info('Cron: Generating daily tasks');
  const { rows: users } = await pool.query('SELECT id FROM users');
  for (const u of users) {
    await generateDailyTasks(u.id).catch((err) => logger.error({ err, userId: u.id }, 'Daily task generation failed'));
  }
});

// Every Sunday at 20:00 — full AI progress evaluation
cron.schedule('0 20 * * 0', async () => {
  logger.info('Cron: Weekly evaluation');
  const { rows: users } = await pool.query('SELECT id FROM users');
  for (const u of users) {
    await runDailyEvaluation(u.id).catch((err) => logger.error({ err, userId: u.id }, 'Weekly evaluation failed'));
  }
});

// ── Start ───────────────────────────────────────────────────────
app.listen(PORT, () => {
  logger.info({ port: PORT }, 'IELTS B1 Backend started');
});
