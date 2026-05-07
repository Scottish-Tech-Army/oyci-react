import initSqlJs, { type Database, type SqlJsStatic } from 'sql.js';
import wasmUrl from 'sql.js/dist/sql-wasm.wasm?url';
import { LEGACY_DB_STORAGE_KEY, type AppStateSnapshot, hasAnyData } from '../shared/appState';

interface LoadAppStateResponse {
  snapshot: AppStateSnapshot;
  hasStoredState: boolean;
}

export class StaleSnapshotError extends Error {
  constructor() {
    super('Your data is out of date. Refresh and try again.');
    this.name = 'StaleSnapshotError';
  }
}

let sqlPromise: Promise<SqlJsStatic> | null = null;

function decodeBase64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.codePointAt(i) ?? 0;
  }
  return bytes;
}

async function getSqlJs(): Promise<SqlJsStatic> {
  sqlPromise ??= initSqlJs({
    locateFile: () => wasmUrl,
  });

  return sqlPromise;
}

async function createLegacyDatabase(): Promise<Database | null> {
  const stored = localStorage.getItem(LEGACY_DB_STORAGE_KEY);
  if (!stored) {
    return null;
  }

  const SQL = await getSqlJs();
  return new SQL.Database(decodeBase64ToBytes(stored));
}

async function parseJsonResponse<T>(response: Response): Promise<T> {
  if (response.status === 409) {
    throw new StaleSnapshotError();
  }

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function loadAppState(): Promise<LoadAppStateResponse> {
  const response = await fetch('/api/app-state');
  return parseJsonResponse<LoadAppStateResponse>(response);
}

export async function importLegacyAppState(snapshot: AppStateSnapshot): Promise<AppStateSnapshot> {
  const response = await fetch('/api/app-state/import', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(snapshot),
  });

  const payload = await parseJsonResponse<{ snapshot: AppStateSnapshot }>(response);
  return payload.snapshot;
}

export async function loadLegacyBrowserAppState(): Promise<AppStateSnapshot | null> {
  const db = await createLegacyDatabase();
  if (!db) {
    return null;
  }

  const result = db.exec('SELECT payload FROM app_state WHERE id = 1;');
  const payload = result[0]?.values[0]?.[0];
  if (typeof payload !== 'string') {
    return null;
  }

  try {
    const parsed = JSON.parse(payload) as AppStateSnapshot;
    return hasAnyData(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function clearLegacyBrowserAppState(): void {
  localStorage.removeItem(LEGACY_DB_STORAGE_KEY);
}
