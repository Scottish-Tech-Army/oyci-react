import pino from 'pino';
import { pinoHttp } from 'pino-http';

const isDev = process.env.NODE_ENV !== 'production';

export const logger = pino({
  level: process.env.LOG_LEVEL || (isDev ? 'debug' : 'info'),
  transport: isDev
    ? { target: 'pino-pretty', options: { colorize: true } }
    : undefined,
});

export const httpLogger = pinoHttp({ logger });
