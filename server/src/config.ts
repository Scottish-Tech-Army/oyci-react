import path from 'node:path';

const defaultDatabasePath = path.join(process.cwd(), 'data', 'app.sqlite');

export const config = {
  port: Number(process.env.PORT || 3001),
  nodeEnv: process.env.NODE_ENV || 'development',
  databasePath: process.env.SQLITE_DB_PATH || defaultDatabasePath,
  corsOriginAllowlist: process.env.CORS_ORIGIN_ALLOWLIST
    ? (JSON.parse(process.env.CORS_ORIGIN_ALLOWLIST) as string[])
    : ['http://localhost:5173', 'http://localhost:3001'],
  rateLimitWindowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000),
  rateLimitMaxRequests: Number(process.env.RATE_LIMIT_MAX_REQUESTS || 100),
  logLevel: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  backupEnabled: process.env.BACKUP_ENABLED !== 'false',
  backupRetentionDays: Number(process.env.BACKUP_RETENTION_DAYS || 7),
};
