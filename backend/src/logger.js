import pino from 'pino';
import 'dotenv/config';

const isProduction = process.env.NODE_ENV === 'production';

const redactedFields = [
  'req.headers.authorization',
  'req.headers.x-api-key',
  'req.headers.x-auth-token',
  'req.body.password',
  'req.body.api_key',
  'req.body.apiKey',
  'req.body.llm_api_key_enc',
  'req.body.tts_api_key_enc',
  'req.body.stt_api_key_enc',
];

export const logger = pino({
  level: isProduction ? 'info' : 'debug',
  formatters: {
    level: (label) => ({ level: label }),
  },
  serializers: {
    req: (req) => ({
      method: req.method,
      url: req.url,
      query: req.query,
    }),
    res: (res) => ({
      statusCode: res.statusCode,
    }),
    err: pino.stdSerializers.err,
  },
  redact: {
    paths: redactedFields,
    censor: '[REDACTED]',
  },
});

export const logRequest = (req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info({
      req,
      res: { statusCode: res.statusCode },
      responseTime: duration,
      requestId: req.requestId,
    });
  });
  next();
};

export default logger;