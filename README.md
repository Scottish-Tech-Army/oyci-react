# OYCI Staff Assignment Management System

Planning and staffing application for OYCI activities, built as a React single-page app with an Express API and SQLite persistence.

## Overview

This project helps coordinators manage:

- staff records, qualifications, and holidays
- event types, locations, and scheduled events
- staff-to-event assignments
- staffing visibility through dashboards, calendars, reports, and weekly email drafts

The frontend no longer relies on a browser-owned full app snapshot for normal operation. It now works against a proper server API with resource-specific endpoints for staff, events, assignments, locations, event types, and qualifications.

## Current Architecture

- Frontend: React 19 + Vite + TypeScript + Material UI
- API: Express 5 server under `server/src`
- Persistence: SQLite database stored on disk at `data/app.sqlite` by default
- Data model: normalized SQLite tables for locations, event types, staff, events, assignments, qualifications, and metadata
- Migration support: legacy browser-local snapshot import still exists only as a compatibility path

The main frontend data flow is now:

- read lists from `/api/staff`, `/api/events`, `/api/locations`, `/api/event-types`, `/api/assignments`, and `/api/qualifications`
- write changes through matching CRUD endpoints
- use `/api/app-state` and `/api/app-state/import` only for fallback and migration scenarios

## Main Application Areas

- Dashboard: staffing overview, upcoming work, and utilization summaries
- Staff: staff records, availability, holidays, and qualifications
- Events: event scheduling with location and event type links
- Assignments: assign available staff to events
- Calendar: admin calendar and schedule visibility
- Reporting: date-range reporting and CSV export
- Emails: generate weekly assignment email drafts and open `mailto:` links
- Admin: manage shared qualifications and locations
- Public calendar: separate read-oriented calendar route for external viewing

## Routes

- Admin app: `/`
- Public calendar: `/cal`

## API Summary

### Health and readiness

- `GET /api/health`
- `GET /api/ready`

### Resource endpoints

- `GET /api/staff`
- `POST /api/staff`
- `PUT /api/staff/:id`
- `DELETE /api/staff/:id`

- `GET /api/events`
- `POST /api/events`
- `PUT /api/events/:id`
- `DELETE /api/events/:id`

- `GET /api/locations`
- `POST /api/locations`
- `PUT /api/locations/:id`
- `DELETE /api/locations/:id`

- `GET /api/event-types`
- `POST /api/event-types`
- `PUT /api/event-types/:id`
- `DELETE /api/event-types/:id`

- `GET /api/assignments`
- `POST /api/assignments`
- `PUT /api/assignments/:id`
- `DELETE /api/assignments/:id`

- `GET /api/qualifications`
- `POST /api/qualifications`
- `PUT /api/qualifications/:name`
- `DELETE /api/qualifications/:name`

### Compatibility and migration endpoints

- `GET /api/app-state`
- `POST /api/app-state/import`

## Development

### Prerequisites

- Node.js 20+
- npm

### Install dependencies

```bash
npm install
```

### Run locally

Run frontend and backend together:

```bash
npm run dev:all
```

Or run them separately:

```bash
npm run dev
npm run dev:server
```

### Local URLs

- Frontend: `http://localhost:5173`
- API: `http://localhost:3001`

Vite proxies `/api` requests to the backend during development.

## Scripts

- `npm run dev`: start the Vite frontend
- `npm run dev:server`: start the Express API with `tsx watch`
- `npm run dev:all`: run frontend and backend together
- `npm run build`: build frontend and backend
- `npm run build:client`: build the client bundle into `dist`
- `npm run build:server`: compile the server into `dist-server`
- `npm run preview`: preview the built frontend
- `npm run start:server`: run the compiled backend
- `npm run lint`: run ESLint
- `npm run test`: run Vitest once
- `npm run test:watch`: run Vitest in watch mode
- `npm run test:coverage`: run tests with coverage

## Data Storage and Backups

By default the server uses:

- database file: `data/app.sqlite`
- backup directory: `data/backups`

On startup the server initializes the backup directory, attempts a backup, and then keeps daily backups. Old backups are cleaned up based on the configured retention period.

If the database is empty, the app seeds sample OYCI-style data so the UI has something usable immediately.

## Configuration

The backend is configured through environment variables.

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `3001` | API port |
| `NODE_ENV` | `development` | Runtime environment |
| `SQLITE_DB_PATH` | `data/app.sqlite` | SQLite database path |
| `CORS_ORIGIN_ALLOWLIST` | `['http://localhost:5173','http://localhost:3001']` | Allowed origins as JSON array |
| `RATE_LIMIT_WINDOW_MS` | `900000` | Rate-limit window |
| `RATE_LIMIT_MAX_REQUESTS` | `100` | Max requests per window |
| `LOG_LEVEL` | `debug` in dev, `info` in prod | Server logging level |
| `BACKUP_ENABLED` | `true` | Enable database backups |
| `BACKUP_RETENTION_DAYS` | `7` | Number of backups to keep |

Example:

```bash
PORT=3001
SQLITE_DB_PATH=./data/app.sqlite
BACKUP_RETENTION_DAYS=14
```

## Docker and GCP Deployment

This app can be dockerized, but the right GCP deployment model depends on how you want to handle persistence.

### Important constraints first

- the frontend calls `/api/...` on the same origin, so production hosting should either serve the SPA and API behind one hostname or add a reverse proxy/load balancer that routes `/api` to the backend
- the current Express server does not serve the built frontend from `dist`, so a production deployment needs either a separate static host for the SPA or an added static-serving layer
- the current persistence model uses a local SQLite file and local backup files, which works well on a VM or persistent volume but is a poor fit for Cloud Run's ephemeral filesystem

### Recommended options on GCP

#### Option 1: Keep SQLite and deploy to Compute Engine

This is the lowest-friction path if you want to keep the current database layer.

- build the frontend and backend in CI
- run the backend in Docker on a Compute Engine VM
- store `data/app.sqlite` and `data/backups` on the VM disk or a mounted persistent disk
- serve the frontend through Nginx, Caddy, or another small web server
- proxy `/api` from the web server to the Node process

This keeps the current SQLite-based implementation largely intact.

#### Option 2: Move the database off SQLite and deploy to Cloud Run

This is the better long-term GCP-native option, but it requires a persistence change.

- replace the local SQLite storage with a managed database such as Cloud SQL for PostgreSQL
- containerize the API and deploy it to Cloud Run
- deploy the frontend either as a second Cloud Run service or as static assets behind Cloud Storage + Cloud CDN
- put both behind one HTTPS hostname and route `/api` to the backend service

Cloud Run is a good fit for the API process, but not for a durable SQLite file stored inside the container.

### Example dockerization shape

The backend can be packaged with a multi-stage Node build. A typical Dockerfile would:

1. install dependencies
2. run `npm run build`
3. copy the production dependencies and `dist-server` output into a slim runtime image
4. start the server with `npm run start:server`

Example:

```dockerfile
FROM node:20-bookworm-slim AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:20-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=build /app/dist-server ./dist-server

EXPOSE 3001
CMD ["npm", "run", "start:server"]
```

If you keep SQLite, mount a writable directory for `data/` so the database and backups survive container restarts.

### Example production topology

For this codebase as it stands today, a practical production layout would be:

- frontend static files served by Nginx or Caddy
- backend container running the Express API
- reverse proxy rule sending `/api/*` to the backend
- persistent disk mounted for `data/app.sqlite` and `data/backups`
- optional managed HTTPS load balancer in front

### What would need changing for a cleaner Cloud Run deployment

To make this app cleaner to run on Cloud Run, the next engineering steps would be:

- migrate persistence from local SQLite to Cloud SQL
- add explicit frontend API base URL handling or keep same-origin routing behind a load balancer
- decide whether the frontend should be served as static assets or from a small web container
- move backup strategy from local file copies to managed database backups

### Suggested deployment sequence

1. Dockerize the API first and run it locally with a mounted `data/` directory.
2. Decide whether you want the short path of Compute Engine plus SQLite, or the longer path of Cloud Run plus Cloud SQL.
3. Put the frontend and API behind one hostname so `/api` continues to work without code changes.
4. Add CI to build and push images to Artifact Registry before wiring up the final GCP service.

## Project Structure

```text
src/
  api/                Frontend API client helpers
  components/         Shared UI components
  context/            Application state and actions
  db/                 Legacy migration and compatibility storage helpers
  pages/              Main screens and route content
  shared/             Shared app-state contracts and seed data
  types/              Domain types
  utils/              Utility functions and tests

server/src/
  index.ts            Express server and routes
  database.ts         SQLite schema and data access
  schema.ts           Validation and referential integrity checks
  backup.ts           Backup lifecycle
  config.ts           Environment-driven configuration
  logger.ts           Structured logging
```


## Known Constraints

- there is no authentication or role separation yet
- optimistic client updates can still need a server resync on failed writes
- legacy compatibility code is still present while older data paths are phased out
- some unrelated UI lint issues may still exist outside the persistence work

## Build Output

- frontend output: `dist`
- backend output: `dist-server`

Build both with:

```bash
npm run build
```

## Testing

Unit tests currently live under `src/utils/__tests__` and run with Vitest.

```bash
npm run test
```


