import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import initSqlJs, { type Database, type SqlJsStatic } from 'sql.js';
import { Mutex } from 'async-mutex';
import type {
  Assignment,
  Event,
  EventType,
  HolidayPeriod,
  Location,
  Staff,
} from '../../src/types/index.js';
import { buildSeedSnapshot, type AppStateSnapshot, hasAnyData } from '../../src/shared/appState.js';
import { syncEventTypeRequirements } from '../../src/shared/staffRequirements.js';
import { config } from './config.js';
import { logger } from './logger.js';
import { parseAppStateSnapshot, validateReferentialIntegrity } from './schema.js';

export interface LoadAppStateResult {
  snapshot: AppStateSnapshot;
  hasStoredState: boolean;
}

export class ConflictError extends Error {
  constructor(message = 'Snapshot is stale. Reload and retry.') {
    super(message);
    this.name = 'ConflictError';
  }
}

const databaseDirectory = path.dirname(config.databasePath);
fs.mkdirSync(databaseDirectory, { recursive: true });

const require = createRequire(import.meta.url);
const wasmPath = require.resolve('sql.js/dist/sql-wasm.wasm');

let sqlPromise: Promise<SqlJsStatic> | null = null;
let databasePromise: Promise<Database> | null = null;
const writeMutex = new Mutex();

function hasColumn(db: Database, tableName: string, columnName: string): boolean {
  const result = db.exec(`PRAGMA table_info(${tableName});`);
  const rows = result[0]?.values ?? [];

  return rows.some((row) => String(row[1]) === columnName);
}

function ensureSchema(db: Database): void {
  db.run('PRAGMA foreign_keys = ON;');

  db.run(`
    CREATE TABLE IF NOT EXISTS metadata (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      version INTEGER NOT NULL DEFAULT 0
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS locations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      address TEXT NOT NULL,
      capacity REAL,
      created_at TEXT NOT NULL
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS event_types (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      duration_minutes REAL NOT NULL,
      required_qualifications_json TEXT NOT NULL,
      minimum_staff_required REAL NOT NULL,
      staff_requirements_json TEXT,
      created_at TEXT NOT NULL
    );
  `);

  if (!hasColumn(db, 'event_types', 'staff_requirements_json')) {
    db.run('ALTER TABLE event_types ADD COLUMN staff_requirements_json TEXT;');
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS staff (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT,
      qualifications_json TEXT NOT NULL,
      pay_type TEXT NOT NULL,
      available_hours_per_week REAL NOT NULL,
      holidays_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      event_type_id TEXT NOT NULL,
      location_id TEXT NOT NULL,
      date TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      staff_start_time TEXT NOT NULL,
      staff_end_time TEXT NOT NULL,
      max_attendees REAL,
      notes TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (event_type_id) REFERENCES event_types(id),
      FOREIGN KEY (location_id) REFERENCES locations(id)
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS assignments (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL,
      staff_id TEXT NOT NULL,
      hours_allocated REAL NOT NULL,
      confirmed_at TEXT NOT NULL,
      notes TEXT,
      FOREIGN KEY (event_id) REFERENCES events(id),
      FOREIGN KEY (staff_id) REFERENCES staff(id)
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS qualifications_catalog (
      name TEXT PRIMARY KEY
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL
    );
  `);

  db.run('INSERT OR IGNORE INTO schema_migrations (version, applied_at) VALUES (1, ?);', [
    new Date().toISOString(),
  ]);

  db.run(
    `
      INSERT OR IGNORE INTO metadata (id, updated_at, version)
      VALUES (1, ?, 0);
    `,
    [new Date().toISOString()],
  );
}

async function getSqlJs(): Promise<SqlJsStatic> {
  sqlPromise ??= initSqlJs({
    locateFile: () => wasmPath,
  });

  return sqlPromise;
}

async function openDatabase(): Promise<Database> {
  const SQL = await getSqlJs();
  const fileExists = fs.existsSync(config.databasePath);
  const db = fileExists
    ? new SQL.Database(new Uint8Array(fs.readFileSync(config.databasePath)))
    : new SQL.Database();

  ensureSchema(db);
  return db;
}

async function getDatabase(): Promise<Database> {
  databasePromise ??= openDatabase();

  return databasePromise;
}

function persistDatabase(db: Database): void {
  fs.writeFileSync(config.databasePath, Buffer.from(db.export()));
  logger.debug('Database persisted');
}

function getCurrentVersion(db: Database): number {
  const result = db.exec('SELECT version FROM metadata WHERE id = 1;');
  const value = result[0]?.values[0]?.[0];
  return typeof value === 'number' ? value : 0;
}

function readTableRows(db: Database, query: string): unknown[][] {
  const result = db.exec(query);
  return result[0]?.values ?? [];
}

function parseJsonArray<T>(value: unknown): T[] {
  if (typeof value !== 'string') return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function buildSnapshotFromTables(db: Database, version: number): AppStateSnapshot {
  const locationsRows = readTableRows(
    db,
    'SELECT id, name, address, capacity, created_at FROM locations ORDER BY id;',
  );
  const eventTypeRows = readTableRows(
    db,
    'SELECT id, name, description, duration_minutes, required_qualifications_json, minimum_staff_required, staff_requirements_json, created_at FROM event_types ORDER BY id;',
  );
  const staffRows = readTableRows(
    db,
    'SELECT id, name, email, phone, qualifications_json, pay_type, available_hours_per_week, holidays_json, created_at FROM staff ORDER BY id;',
  );
  const eventRows = readTableRows(
    db,
    'SELECT id, event_type_id, location_id, date, start_time, end_time, staff_start_time, staff_end_time, max_attendees, notes, created_at FROM events ORDER BY id;',
  );
  const assignmentRows = readTableRows(
    db,
    'SELECT id, event_id, staff_id, hours_allocated, confirmed_at, notes FROM assignments ORDER BY id;',
  );
  const qualificationsRows = readTableRows(
    db,
    'SELECT name FROM qualifications_catalog ORDER BY name;',
  );

  const locations: Location[] = locationsRows.map((row) => ({
    id: String(row[0]),
    name: String(row[1]),
    address: String(row[2]),
    capacity: typeof row[3] === 'number' ? row[3] : undefined,
    createdAt: String(row[4]),
  }));

  const eventTypes: EventType[] = eventTypeRows.map((row) => syncEventTypeRequirements({
    id: String(row[0]),
    name: String(row[1]),
    description: String(row[2]),
    durationMinutes: Number(row[3]),
    requiredQualifications: parseJsonArray<string>(row[4]),
    minimumStaffRequired: Number(row[5]),
    staffRequirements: parseJsonArray<NonNullable<EventType['staffRequirements']>[number]>(row[6]),
    createdAt: String(row[7]),
  }));

  const staff: Staff[] = staffRows.map((row) => ({
    id: String(row[0]),
    name: String(row[1]),
    email: String(row[2]),
    phone: typeof row[3] === 'string' ? row[3] : undefined,
    qualifications: parseJsonArray<string>(row[4]),
    payType: String(row[5]) as Staff['payType'],
    availableHoursPerWeek: Number(row[6]),
    holidays: parseJsonArray<HolidayPeriod>(row[7]),
    createdAt: String(row[8]),
  }));

  const events: Event[] = eventRows.map((row) => ({
    id: String(row[0]),
    eventTypeId: String(row[1]),
    locationId: String(row[2]),
    date: String(row[3]),
    startTime: String(row[4]),
    endTime: String(row[5]),
    staffStartTime: String(row[6]),
    staffEndTime: String(row[7]),
    maxAttendees: typeof row[8] === 'number' ? row[8] : undefined,
    notes: typeof row[9] === 'string' ? row[9] : undefined,
    createdAt: String(row[10]),
  }));

  const assignments: Assignment[] = assignmentRows.map((row) => ({
    id: String(row[0]),
    eventId: String(row[1]),
    staffId: String(row[2]),
    hoursAllocated: Number(row[3]),
    confirmedAt: String(row[4]),
    notes: typeof row[5] === 'string' ? row[5] : undefined,
  }));

  const qualifications = qualificationsRows.map((row) => String(row[0]));

  return {
    locations,
    eventTypes,
    staff,
    events,
    assignments,
    qualifications,
    version,
  };
}

function clearDataTables(db: Database): void {
  db.run('DELETE FROM assignments;');
  db.run('DELETE FROM events;');
  db.run('DELETE FROM staff;');
  db.run('DELETE FROM event_types;');
  db.run('DELETE FROM locations;');
  db.run('DELETE FROM qualifications_catalog;');
}

function insertSnapshotRows(db: Database, snapshot: AppStateSnapshot): void {
  for (const location of snapshot.locations) {
    db.run(
      `
        INSERT INTO locations (id, name, address, capacity, created_at)
        VALUES (?, ?, ?, ?, ?);
      `,
      [
        location.id,
        location.name,
        location.address,
        location.capacity ?? null,
        location.createdAt,
      ],
    );
  }

  for (const eventType of snapshot.eventTypes) {
    db.run(
      `
        INSERT INTO event_types (
          id,
          name,
          description,
          duration_minutes,
          required_qualifications_json,
          minimum_staff_required,
          staff_requirements_json,
          created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?);
      `,
      [
        eventType.id,
        eventType.name,
        eventType.description,
        eventType.durationMinutes,
        JSON.stringify(eventType.requiredQualifications),
        eventType.minimumStaffRequired,
        JSON.stringify(eventType.staffRequirements ?? []),
        eventType.createdAt,
      ],
    );
  }

  for (const member of snapshot.staff) {
    db.run(
      `
        INSERT INTO staff (
          id,
          name,
          email,
          phone,
          qualifications_json,
          pay_type,
          available_hours_per_week,
          holidays_json,
          created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
      `,
      [
        member.id,
        member.name,
        member.email,
        member.phone ?? null,
        JSON.stringify(member.qualifications),
        member.payType,
        member.availableHoursPerWeek,
        JSON.stringify(member.holidays),
        member.createdAt,
      ],
    );
  }

  for (const event of snapshot.events) {
    db.run(
      `
        INSERT INTO events (
          id,
          event_type_id,
          location_id,
          date,
          start_time,
          end_time,
          staff_start_time,
          staff_end_time,
          max_attendees,
          notes,
          created_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
      `,
      [
        event.id,
        event.eventTypeId,
        event.locationId,
        event.date,
        event.startTime,
        event.endTime,
        event.staffStartTime,
        event.staffEndTime,
        event.maxAttendees ?? null,
        event.notes ?? null,
        event.createdAt,
      ],
    );
  }

  for (const assignment of snapshot.assignments) {
    db.run(
      `
        INSERT INTO assignments (id, event_id, staff_id, hours_allocated, confirmed_at, notes)
        VALUES (?, ?, ?, ?, ?, ?);
      `,
      [
        assignment.id,
        assignment.eventId,
        assignment.staffId,
        assignment.hoursAllocated,
        assignment.confirmedAt,
        assignment.notes ?? null,
      ],
    );
  }

  for (const qualification of snapshot.qualifications) {
    db.run('INSERT OR IGNORE INTO qualifications_catalog (name) VALUES (?);', [qualification]);
  }
}

export async function getDbHealth(): Promise<{ status: 'ok' | 'error'; lastUpdated?: string; message?: string }> {
  try {
    const db = await getDatabase();
    const result = db.exec('SELECT updated_at FROM metadata WHERE id = 1;');
    const row = result[0]?.values[0]?.[0] as string | undefined;
    return { status: 'ok', lastUpdated: row };
  } catch (error) {
    logger.error({ error }, 'Database health check failed');
    return { status: 'error', message: error instanceof Error ? error.message : 'Unknown' };
  }
}

export async function seedIfEmpty(): Promise<void> {
  const db = await getDatabase();
  const version = getCurrentVersion(db);

  try {
    const snapshot = parseAppStateSnapshot(buildSnapshotFromTables(db, version));
    if (!hasAnyData(snapshot)) {
      await saveAppState(buildSeedSnapshot(), { forceWrite: true });
      logger.info('Database was empty — seeded with default data');
    }
  } catch {
    await saveAppState(buildSeedSnapshot(), { forceWrite: true });
    logger.info('Database seed applied after schema error');
  }
}

export async function getAppState(): Promise<LoadAppStateResult> {
  const db = await getDatabase();
  const version = getCurrentVersion(db);

  try {
    const snapshot = parseAppStateSnapshot(buildSnapshotFromTables(db, version));

    if (!hasAnyData(snapshot)) {
      const seededSnapshot = await saveAppState(buildSeedSnapshot(), { forceWrite: true });
      return { snapshot: seededSnapshot, hasStoredState: false };
    }

    return { snapshot, hasStoredState: true };
  } catch {
    const seededSnapshot = await saveAppState(buildSeedSnapshot(), { forceWrite: true });
    return { snapshot: seededSnapshot, hasStoredState: false };
  }
}

export async function getStaffList(): Promise<Staff[]> {
  const db = await getDatabase();
  const rows = readTableRows(
    db,
    'SELECT id, name, email, phone, qualifications_json, pay_type, available_hours_per_week, holidays_json, created_at FROM staff ORDER BY name;',
  );

  return rows.map((row) => ({
    id: String(row[0]),
    name: String(row[1]),
    email: String(row[2]),
    phone: typeof row[3] === 'string' ? row[3] : undefined,
    qualifications: parseJsonArray<string>(row[4]),
    payType: String(row[5]) as Staff['payType'],
    availableHoursPerWeek: Number(row[6]),
    holidays: parseJsonArray<HolidayPeriod>(row[7]),
    createdAt: String(row[8]),
  }));
}

export async function getLocationsList(): Promise<Location[]> {
  const db = await getDatabase();
  const rows = readTableRows(
    db,
    'SELECT id, name, address, capacity, created_at FROM locations ORDER BY name;',
  );

  return rows.map((row) => ({
    id: String(row[0]),
    name: String(row[1]),
    address: String(row[2]),
    capacity: typeof row[3] === 'number' ? row[3] : undefined,
    createdAt: String(row[4]),
  }));
}

export async function getEventTypesList(): Promise<EventType[]> {
  const db = await getDatabase();
  const rows = readTableRows(
    db,
    'SELECT id, name, description, duration_minutes, required_qualifications_json, minimum_staff_required, staff_requirements_json, created_at FROM event_types ORDER BY name;',
  );

  return rows.map((row) => syncEventTypeRequirements({
    id: String(row[0]),
    name: String(row[1]),
    description: String(row[2]),
    durationMinutes: Number(row[3]),
    requiredQualifications: parseJsonArray<string>(row[4]),
    minimumStaffRequired: Number(row[5]),
    staffRequirements: parseJsonArray<NonNullable<EventType['staffRequirements']>[number]>(row[6]),
    createdAt: String(row[7]),
  }));
}

export async function getAssignmentsList(): Promise<Assignment[]> {
  const db = await getDatabase();
  const rows = readTableRows(
    db,
    'SELECT id, event_id, staff_id, hours_allocated, confirmed_at, notes FROM assignments ORDER BY confirmed_at DESC;',
  );

  return rows.map((row) => ({
    id: String(row[0]),
    eventId: String(row[1]),
    staffId: String(row[2]),
    hoursAllocated: Number(row[3]),
    confirmedAt: String(row[4]),
    notes: typeof row[5] === 'string' ? row[5] : undefined,
  }));
}

export async function getQualificationsList(): Promise<string[]> {
  const db = await getDatabase();
  const rows = readTableRows(
    db,
    'SELECT name FROM qualifications_catalog ORDER BY name;',
  );
  return rows.map((row) => String(row[0]));
}

export async function getEventsList(filters?: { from?: string; to?: string }): Promise<Event[]> {
  const db = await getDatabase();

  const conditions: string[] = [];
  const params: string[] = [];

  if (filters?.from) {
    conditions.push('date >= ?');
    params.push(filters.from);
  }
  if (filters?.to) {
    conditions.push('date <= ?');
    params.push(filters.to);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const query = `
    SELECT id, event_type_id, location_id, date, start_time, end_time, staff_start_time, staff_end_time, max_attendees, notes, created_at
    FROM events
    ${whereClause}
    ORDER BY date, start_time;
  `;

  const result = db.exec(query, params);
  const rows = result[0]?.values ?? [];

  return rows.map((row) => ({
    id: String(row[0]),
    eventTypeId: String(row[1]),
    locationId: String(row[2]),
    date: String(row[3]),
    startTime: String(row[4]),
    endTime: String(row[5]),
    staffStartTime: String(row[6]),
    staffEndTime: String(row[7]),
    maxAttendees: typeof row[8] === 'number' ? row[8] : undefined,
    notes: typeof row[9] === 'string' ? row[9] : undefined,
    createdAt: String(row[10]),
  }));
}

export async function createLocation(location: Location): Promise<Location> {
  return writeMutex.runExclusive(async () => {
    const db = await getDatabase();
    db.run(
      'INSERT INTO locations (id, name, address, capacity, created_at) VALUES (?, ?, ?, ?, ?);',
      [location.id, location.name, location.address, location.capacity ?? null, location.createdAt],
    );
    persistDatabase(db);
    return location;
  });
}

export async function updateLocation(id: string, location: Location): Promise<Location> {
  return writeMutex.runExclusive(async () => {
    const db = await getDatabase();
    db.run(
      'UPDATE locations SET name = ?, address = ?, capacity = ? WHERE id = ?;',
      [location.name, location.address, location.capacity ?? null, id],
    );
    persistDatabase(db);
    return location;
  });
}

export async function deleteLocation(id: string): Promise<void> {
  return writeMutex.runExclusive(async () => {
    const db = await getDatabase();
    db.run('DELETE FROM locations WHERE id = ?;', [id]);
    persistDatabase(db);
  });
}

export async function createEventType(eventType: EventType): Promise<EventType> {
  return writeMutex.runExclusive(async () => {
    const db = await getDatabase();
    const normalizedEventType = syncEventTypeRequirements(eventType);
    db.run(
      `INSERT INTO event_types (id, name, description, duration_minutes, required_qualifications_json, minimum_staff_required, staff_requirements_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        normalizedEventType.id,
        normalizedEventType.name,
        normalizedEventType.description,
        normalizedEventType.durationMinutes,
        JSON.stringify(normalizedEventType.requiredQualifications),
        normalizedEventType.minimumStaffRequired,
        JSON.stringify(normalizedEventType.staffRequirements ?? []),
        normalizedEventType.createdAt,
      ],
    );
    persistDatabase(db);
    return normalizedEventType;
  });
}

export async function updateEventType(id: string, eventType: EventType): Promise<EventType> {
  return writeMutex.runExclusive(async () => {
    const db = await getDatabase();
    const normalizedEventType = syncEventTypeRequirements(eventType);
    db.run(
      `UPDATE event_types SET name = ?, description = ?, duration_minutes = ?,
       required_qualifications_json = ?, minimum_staff_required = ?, staff_requirements_json = ? WHERE id = ?;`,
      [
        normalizedEventType.name,
        normalizedEventType.description,
        normalizedEventType.durationMinutes,
        JSON.stringify(normalizedEventType.requiredQualifications),
        normalizedEventType.minimumStaffRequired,
        JSON.stringify(normalizedEventType.staffRequirements ?? []),
        id,
      ],
    );
    persistDatabase(db);
    return normalizedEventType;
  });
}

export async function deleteEventType(id: string): Promise<void> {
  return writeMutex.runExclusive(async () => {
    const db = await getDatabase();
    db.run('DELETE FROM event_types WHERE id = ?;', [id]);
    persistDatabase(db);
  });
}

export async function createStaff(member: Staff): Promise<Staff> {
  return writeMutex.runExclusive(async () => {
    const db = await getDatabase();
    db.run(
      `INSERT INTO staff (id, name, email, phone, qualifications_json, pay_type, available_hours_per_week, holidays_json, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        member.id,
        member.name,
        member.email,
        member.phone ?? null,
        JSON.stringify(member.qualifications),
        member.payType,
        member.availableHoursPerWeek,
        JSON.stringify(member.holidays),
        member.createdAt,
      ],
    );
    persistDatabase(db);
    return member;
  });
}

export async function updateStaff(id: string, member: Staff): Promise<Staff> {
  return writeMutex.runExclusive(async () => {
    const db = await getDatabase();
    db.run(
      `UPDATE staff SET name = ?, email = ?, phone = ?, qualifications_json = ?,
       pay_type = ?, available_hours_per_week = ?, holidays_json = ? WHERE id = ?;`,
      [
        member.name,
        member.email,
        member.phone ?? null,
        JSON.stringify(member.qualifications),
        member.payType,
        member.availableHoursPerWeek,
        JSON.stringify(member.holidays),
        id,
      ],
    );
    persistDatabase(db);
    return member;
  });
}

export async function deleteStaff(id: string): Promise<void> {
  return writeMutex.runExclusive(async () => {
    const db = await getDatabase();
    db.run('BEGIN;');
    try {
      db.run('DELETE FROM assignments WHERE staff_id = ?;', [id]);
      db.run('DELETE FROM staff WHERE id = ?;', [id]);
      db.run('COMMIT;');
    } catch (error) {
      db.run('ROLLBACK;');
      throw error;
    }
    persistDatabase(db);
  });
}

export async function createEvent(event: Event): Promise<Event> {
  return writeMutex.runExclusive(async () => {
    const db = await getDatabase();
    db.run(
      `INSERT INTO events (id, event_type_id, location_id, date, start_time, end_time,
       staff_start_time, staff_end_time, max_attendees, notes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        event.id,
        event.eventTypeId,
        event.locationId,
        event.date,
        event.startTime,
        event.endTime,
        event.staffStartTime,
        event.staffEndTime,
        event.maxAttendees ?? null,
        event.notes ?? null,
        event.createdAt,
      ],
    );
    persistDatabase(db);
    return event;
  });
}

export async function updateEvent(id: string, event: Event): Promise<Event> {
  return writeMutex.runExclusive(async () => {
    const db = await getDatabase();
    db.run(
      `UPDATE events SET event_type_id = ?, location_id = ?, date = ?, start_time = ?, end_time = ?,
       staff_start_time = ?, staff_end_time = ?, max_attendees = ?, notes = ? WHERE id = ?;`,
      [
        event.eventTypeId,
        event.locationId,
        event.date,
        event.startTime,
        event.endTime,
        event.staffStartTime,
        event.staffEndTime,
        event.maxAttendees ?? null,
        event.notes ?? null,
        id,
      ],
    );
    persistDatabase(db);
    return event;
  });
}

export async function deleteEvent(id: string): Promise<void> {
  return writeMutex.runExclusive(async () => {
    const db = await getDatabase();
    db.run('BEGIN;');
    try {
      db.run('DELETE FROM assignments WHERE event_id = ?;', [id]);
      db.run('DELETE FROM events WHERE id = ?;', [id]);
      db.run('COMMIT;');
    } catch (error) {
      db.run('ROLLBACK;');
      throw error;
    }
    persistDatabase(db);
  });
}

export async function createAssignment(assignment: Assignment): Promise<Assignment> {
  return writeMutex.runExclusive(async () => {
    const db = await getDatabase();
    db.run(
      'INSERT INTO assignments (id, event_id, staff_id, hours_allocated, confirmed_at, notes) VALUES (?, ?, ?, ?, ?, ?);',
      [
        assignment.id,
        assignment.eventId,
        assignment.staffId,
        assignment.hoursAllocated,
        assignment.confirmedAt,
        assignment.notes ?? null,
      ],
    );
    persistDatabase(db);
    return assignment;
  });
}

export async function updateAssignment(id: string, assignment: Assignment): Promise<Assignment> {
  return writeMutex.runExclusive(async () => {
    const db = await getDatabase();
    db.run(
      'UPDATE assignments SET event_id = ?, staff_id = ?, hours_allocated = ?, confirmed_at = ?, notes = ? WHERE id = ?;',
      [
        assignment.eventId,
        assignment.staffId,
        assignment.hoursAllocated,
        assignment.confirmedAt,
        assignment.notes ?? null,
        id,
      ],
    );
    persistDatabase(db);
    return assignment;
  });
}

export async function deleteAssignment(id: string): Promise<void> {
  return writeMutex.runExclusive(async () => {
    const db = await getDatabase();
    db.run('DELETE FROM assignments WHERE id = ?;', [id]);
    persistDatabase(db);
  });
}

export async function addQualification(name: string): Promise<void> {
  return writeMutex.runExclusive(async () => {
    const db = await getDatabase();
    db.run('INSERT OR IGNORE INTO qualifications_catalog (name) VALUES (?);', [name]);
    persistDatabase(db);
  });
}

export async function renameQualification(oldName: string, newName: string): Promise<void> {
  return writeMutex.runExclusive(async () => {
    const db = await getDatabase();
    db.run('BEGIN;');
    try {
      db.run('INSERT OR IGNORE INTO qualifications_catalog (name) VALUES (?);', [newName]);
      db.run('DELETE FROM qualifications_catalog WHERE name = ?;', [oldName]);

      // Update all event_types that reference the old qualification name
      const etRows = readTableRows(db, 'SELECT id, required_qualifications_json FROM event_types;');
      for (const row of etRows) {
        const quals = parseJsonArray<string>(row[1]);
        const updated = quals.map((q) => (q === oldName ? newName : q));
        db.run('UPDATE event_types SET required_qualifications_json = ? WHERE id = ?;', [
          JSON.stringify(updated),
          String(row[0]),
        ]);
      }

      const eventTypeRequirementRows = readTableRows(db, 'SELECT id, staff_requirements_json FROM event_types;');
      for (const row of eventTypeRequirementRows) {
        const requirements = parseJsonArray<NonNullable<EventType['staffRequirements']>[number]>(row[1]);
        if (requirements.length === 0) {
          continue;
        }

        const updatedRequirements = requirements.map((requirement) => ({
          ...requirement,
          requiredQualifications: requirement.requiredQualifications.map((qualification) =>
            qualification === oldName ? newName : qualification,
          ),
        }));
        db.run('UPDATE event_types SET staff_requirements_json = ? WHERE id = ?;', [
          JSON.stringify(updatedRequirements),
          String(row[0]),
        ]);
      }

      // Update all staff that reference the old qualification name
      const staffRows = readTableRows(db, 'SELECT id, qualifications_json FROM staff;');
      for (const row of staffRows) {
        const quals = parseJsonArray<string>(row[1]);
        const updated = quals.map((q) => (q === oldName ? newName : q));
        db.run('UPDATE staff SET qualifications_json = ? WHERE id = ?;', [
          JSON.stringify(updated),
          String(row[0]),
        ]);
      }

      db.run('COMMIT;');
    } catch (error) {
      db.run('ROLLBACK;');
      throw error;
    }
    persistDatabase(db);
  });
}

export async function removeQualification(name: string): Promise<void> {
  return writeMutex.runExclusive(async () => {
    const db = await getDatabase();
    db.run('DELETE FROM qualifications_catalog WHERE name = ?;', [name]);
    persistDatabase(db);
  });
}

export async function saveAppState(
  snapshot: AppStateSnapshot,
  options?: { forceWrite?: boolean },
): Promise<AppStateSnapshot> {
  return writeMutex.runExclusive(async () => {
    const db = await getDatabase();
    const parsedSnapshot = parseAppStateSnapshot(snapshot);
    const integrityErrors = validateReferentialIntegrity(parsedSnapshot);
    if (integrityErrors.length > 0) {
      throw new Error(`Referential integrity violation: ${integrityErrors.join('; ')}`);
    }

    const currentVersion = getCurrentVersion(db);

    if (
      !options?.forceWrite &&
      parsedSnapshot.version !== undefined &&
      parsedSnapshot.version !== currentVersion
    ) {
      throw new ConflictError();
    }

    const nextVersion = currentVersion + 1;
    const updatedAt = new Date().toISOString();
    const snapshotToStore = { ...parsedSnapshot, version: undefined };

    db.run('BEGIN;');
    try {
      clearDataTables(db);
      insertSnapshotRows(db, snapshotToStore);
      db.run(
        `
          INSERT INTO metadata (id, updated_at, version)
          VALUES (1, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            updated_at = excluded.updated_at,
            version = excluded.version;
        `,
        [updatedAt, nextVersion],
      );
      db.run('COMMIT;');
    } catch (error) {
      db.run('ROLLBACK;');
      throw error;
    }

    persistDatabase(db);
    return {
      ...snapshotToStore,
      version: nextVersion,
    };
  });
}
