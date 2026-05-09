import pg from 'pg';
import dotenv from 'dotenv';
import { logger } from '../logger.js';
dotenv.config();

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('connect', () => logger.info('PostgreSQL connected'));
pool.on('error', (err) => logger.error({ err }, 'PostgreSQL error'));
