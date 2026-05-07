import fs from 'node:fs';
import path from 'node:path';
import { config } from './config.js';
import { logger } from './logger.js';

const BACKUP_DIR = path.join(path.dirname(config.databasePath), 'backups');

export function initializeBackupDir(): void {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    logger.info({ dir: BACKUP_DIR }, 'Backup directory initialized');
  }
}

export function createBackup(): void {
  if (!config.backupEnabled) return;

  try {
    if (!fs.existsSync(config.databasePath)) return;

    const timestamp = new Date().toISOString().split('T')[0];
    const backupFile = path.join(BACKUP_DIR, `app.sqlite.${timestamp}.backup`);

    if (!fs.existsSync(backupFile)) {
      fs.copyFileSync(config.databasePath, backupFile);
      logger.info({ file: backupFile }, 'Daily backup created');
    }

    cleanOldBackups();
  } catch (error) {
    logger.error({ error }, 'Backup creation failed');
  }
}

function cleanOldBackups(): void {
  try {
    const files = fs.readdirSync(BACKUP_DIR);
    const backupFiles = files
      .filter((f) => f.startsWith('app.sqlite.') && f.endsWith('.backup'))
      .map((f) => ({
        name: f,
        fullPath: path.join(BACKUP_DIR, f),
        time: fs.statSync(path.join(BACKUP_DIR, f)).mtimeMs,
      }))
      .sort((a, b) => b.time - a.time);

    const toDelete = backupFiles.slice(config.backupRetentionDays);
    for (const backup of toDelete) {
      fs.unlinkSync(backup.fullPath);
      logger.info({ file: backup.name }, 'Deleted old backup');
    }
  } catch (error) {
    logger.warn({ error }, 'Backup cleanup failed');
  }
}

export function getLastBackupTimestamp(): string | null {
  try {
    const files = fs.readdirSync(BACKUP_DIR);
    const backupFiles = files.filter(
      (f) => f.startsWith('app.sqlite.') && f.endsWith('.backup'),
    );
    if (backupFiles.length === 0) return null;
    const latest = backupFiles.sort().pop();
    return latest?.replace('app.sqlite.', '').replace('.backup', '') ?? null;
  } catch {
    return null;
  }
}
