import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { v4 as uuidv4 } from 'uuid';
import { config } from './config.js';
import {
  getAppState,
  saveAppState,
  getDbHealth,
  seedIfEmpty,
  getStaffList,
  getEventsList,
  getLocationsList,
  getEventTypesList,
  getAssignmentsList,
  getQualificationsList,
  createLocation,
  updateLocation,
  deleteLocation,
  createEventType,
  updateEventType,
  deleteEventType,
  createStaff,
  updateStaff,
  deleteStaff,
  createEvent,
  updateEvent,
  deleteEvent,
  createAssignment,
  updateAssignment,
  deleteAssignment,
  addQualification,
  renameQualification,
  removeQualification,
} from './database.js';
import {
  parseAppStateSnapshot,
  validateReferentialIntegrity,
  locationSchema,
  eventTypeSchema,
  staffSchema,
  eventSchema,
  assignmentSchema,
} from './schema.js';
import { logger, httpLogger } from './logger.js';
import { initializeBackupDir, createBackup, getLastBackupTimestamp } from './backup.js';

type RequestWithId = express.Request & { id?: string };

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || config.corsOriginAllowlist.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
  }),
);
app.use(httpLogger);
app.use((req, _res, next) => {
  (req as RequestWithId).id = req.header('x-request-id') ?? uuidv4();
  next();
});
app.use(express.json({ limit: '2mb' }));

const apiLimiter = rateLimit({
  windowMs: config.rateLimitWindowMs,
  max: config.rateLimitMaxRequests,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', apiLimiter);

initializeBackupDir();
createBackup();
setInterval(createBackup, 24 * 60 * 60 * 1000);

app.get('/api/health', async (req, res) => {
  try {
    const dbHealth = await getDbHealth();
    const lastBackup = getLastBackupTimestamp();
    res.json({
      ok: true,
      timestamp: new Date().toISOString(),
      database: dbHealth,
      backup: { enabled: config.backupEnabled, lastBackup },
    });
  } catch (error) {
    logger.error({ error }, 'Health check failed');
    res.status(503).json({ ok: false, message: 'Unhealthy', requestId: (req as RequestWithId).id });
  }
});

app.get('/api/ready', async (_req, res) => {
  try {
    await getDbHealth();
    res.json({ ready: true });
  } catch {
    res.status(503).json({ ready: false });
  }
});

app.get('/api/app-state', async (_request, response, next) => {
  try {
    response.json(await getAppState());
  } catch (error) {
    next(error);
  }
});

app.get('/api/staff', async (_request, response, next) => {
  try {
    response.json({ staff: await getStaffList() });
  } catch (error) {
    next(error);
  }
});

app.get('/api/locations', async (_request, response, next) => {
  try {
    response.json({ locations: await getLocationsList() });
  } catch (error) {
    next(error);
  }
});

app.get('/api/event-types', async (_request, response, next) => {
  try {
    response.json({ eventTypes: await getEventTypesList() });
  } catch (error) {
    next(error);
  }
});

app.get('/api/assignments', async (_request, response, next) => {
  try {
    response.json({ assignments: await getAssignmentsList() });
  } catch (error) {
    next(error);
  }
});

app.get('/api/qualifications', async (_request, response, next) => {
  try {
    response.json({ qualifications: await getQualificationsList() });
  } catch (error) {
    next(error);
  }
});

app.get('/api/events', async (request, response, next) => {
  try {
    const from = typeof request.query.from === 'string' ? request.query.from : undefined;
    const to = typeof request.query.to === 'string' ? request.query.to : undefined;
    response.json({ events: await getEventsList({ from, to }) });
  } catch (error) {
    next(error);
  }
});

// --- Individual resource CRUD routes ---

app.post('/api/locations', async (request, response, next) => {
  try {
    const location = locationSchema.parse(request.body);
    response.status(201).json(await createLocation(location));
  } catch (error) {
    next(error);
  }
});

app.put('/api/locations/:id', async (request, response, next) => {
  try {
    const location = locationSchema.parse(request.body);
    response.json(await updateLocation(request.params.id, location));
  } catch (error) {
    next(error);
  }
});

app.delete('/api/locations/:id', async (request, response, next) => {
  try {
    await deleteLocation(request.params.id);
    response.status(204).end();
  } catch (error) {
    next(error);
  }
});

app.post('/api/event-types', async (request, response, next) => {
  try {
    const eventType = eventTypeSchema.parse(request.body);
    response.status(201).json(await createEventType(eventType));
  } catch (error) {
    next(error);
  }
});

app.put('/api/event-types/:id', async (request, response, next) => {
  try {
    const eventType = eventTypeSchema.parse(request.body);
    response.json(await updateEventType(request.params.id, eventType));
  } catch (error) {
    next(error);
  }
});

app.delete('/api/event-types/:id', async (request, response, next) => {
  try {
    await deleteEventType(request.params.id);
    response.status(204).end();
  } catch (error) {
    next(error);
  }
});

app.post('/api/staff', async (request, response, next) => {
  try {
    const member = staffSchema.parse(request.body);
    response.status(201).json(await createStaff(member));
  } catch (error) {
    next(error);
  }
});

app.put('/api/staff/:id', async (request, response, next) => {
  try {
    const member = staffSchema.parse(request.body);
    response.json(await updateStaff(request.params.id, member));
  } catch (error) {
    next(error);
  }
});

app.delete('/api/staff/:id', async (request, response, next) => {
  try {
    await deleteStaff(request.params.id);
    response.status(204).end();
  } catch (error) {
    next(error);
  }
});

app.post('/api/events', async (request, response, next) => {
  try {
    const event = eventSchema.parse(request.body);
    response.status(201).json(await createEvent(event));
  } catch (error) {
    next(error);
  }
});

app.put('/api/events/:id', async (request, response, next) => {
  try {
    const event = eventSchema.parse(request.body);
    response.json(await updateEvent(request.params.id, event));
  } catch (error) {
    next(error);
  }
});

app.delete('/api/events/:id', async (request, response, next) => {
  try {
    await deleteEvent(request.params.id);
    response.status(204).end();
  } catch (error) {
    next(error);
  }
});

app.post('/api/assignments', async (request, response, next) => {
  try {
    const assignment = assignmentSchema.parse(request.body);
    response.status(201).json(await createAssignment(assignment));
  } catch (error) {
    next(error);
  }
});

app.put('/api/assignments/:id', async (request, response, next) => {
  try {
    const assignment = assignmentSchema.parse(request.body);
    response.json(await updateAssignment(request.params.id, assignment));
  } catch (error) {
    next(error);
  }
});

app.delete('/api/assignments/:id', async (request, response, next) => {
  try {
    await deleteAssignment(request.params.id);
    response.status(204).end();
  } catch (error) {
    next(error);
  }
});

app.post('/api/qualifications', async (request, response, next) => {
  try {
    const { name } = request.body as { name?: unknown };
    if (typeof name !== 'string' || !name.trim()) {
      response.status(400).json({ message: 'name is required' });
      return;
    }
    await addQualification(name.trim());
    response.status(201).json({ name: name.trim() });
  } catch (error) {
    next(error);
  }
});

app.put('/api/qualifications/:name', async (request, response, next) => {
  try {
    const oldName = decodeURIComponent(request.params.name);
    const { name: newName } = request.body as { name?: unknown };
    if (typeof newName !== 'string' || !newName.trim()) {
      response.status(400).json({ message: 'name is required' });
      return;
    }
    await renameQualification(oldName, newName.trim());
    response.json({ name: newName.trim() });
  } catch (error) {
    next(error);
  }
});

app.delete('/api/qualifications/:name', async (request, response, next) => {
  try {
    await removeQualification(decodeURIComponent(request.params.name));
    response.status(204).end();
  } catch (error) {
    next(error);
  }
});

app.post('/api/app-state/import', async (request, response, next) => {
  try {
    const snapshot = parseAppStateSnapshot(request.body);
    const integrityErrors = validateReferentialIntegrity(snapshot);
    if (integrityErrors.length > 0) {
      response.status(400).json({ message: 'Referential integrity violation', errors: integrityErrors });
      return;
    }

    response.json({ snapshot: await saveAppState(snapshot, { forceWrite: true }) });
  } catch (error) {
    next(error);
  }
});

app.use((error: unknown, req: express.Request, response: express.Response) => {
  if (response.headersSent) return;

  const requestId = (req as RequestWithId).id ?? uuidv4();
  const isDev = config.nodeEnv !== 'production';

  if (error instanceof Error) {
    logger.error({ error, requestId, path: req.path, method: req.method }, 'Request error');
    response.status(400).json({
      message: error.message,
      requestId,
      ...(isDev && { stack: error.stack }),
    });
    return;
  }

  logger.error({ error, requestId }, 'Unexpected server error');
  response.status(500).json({ message: 'Unexpected server error.', requestId });
});

app.listen(config.port, () => {
  logger.info({ port: config.port, env: config.nodeEnv }, 'Server started');
  seedIfEmpty().catch((err: unknown) => logger.error({ err }, 'Seed failed'));
});
