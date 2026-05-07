# Ochils Youth Community Improvement — Staff Portal

A React frontend for managing staff scheduling at Ochils Youth Community Improvement events. Built with Vite, React 19, TypeScript, Tailwind CSS, and TanStack Query.

## What it does

The portal supports two user roles:

**Admin**
- View a dashboard with event, assignment, and staff counts
- Browse all upcoming events
- Create new events (type, date, location)
- Schedule staff to events — see eligible candidates and assign them with a role

**Staff**
- View their own upcoming event assignments (date, location, role, status)
- Browse the qualifications catalogue

> Authentication is simulated on the frontend (no backend auth yet). Login stores your username and chosen role in `localStorage`.

## Prerequisites

- **Node.js** 18+ and npm
- The **Quarkus backend** (`51a7db-sta-tfg-oyci-quarkus`) running on `http://localhost:8080`

### Starting the backend

```bash
cd ../51a7db-sta-tfg-oyci-quarkus
./mvnw quarkus:dev
```

## Install & run

```bash
npm install
npm run dev
```

The app will be available at **http://localhost:5173**.

## Logging in

Open the app and you will see the login page. Enter any username and pick a role:

| Role  | Example username | Access                                      |
|-------|-----------------|---------------------------------------------|
| Admin | `admin`         | Dashboard, Events, Create Event, Schedule   |
| Staff | `aileen`        | My Events, Qualifications                   |

> **Tip:** Use `aileen` or `gregor` as the staff username — the app fuzzy-matches against the backend's mock staff records (Aileen Campbell, Gregor Macleod) to filter assignments to the right person.

## Available routes

| Path | Role | Description |
|------|------|-------------|
| `/login` | — | Login page |
| `/admin` | Admin | Dashboard with stat cards |
| `/admin/events` | Admin | List of all events |
| `/admin/events/new` | Admin | Create a new event |
| `/admin/events/:id/schedule` | Admin | Assign eligible staff to an event |
| `/staff` | Staff | Upcoming assigned events |
| `/staff/qualifications` | Staff | Qualifications catalogue |

## Tech stack

| Package | Purpose |
|---------|---------|
| React 19 + Vite | UI framework and dev server |
| TypeScript | Type safety |
| Tailwind CSS v4 | Utility-first styling |
| react-router-dom | Client-side routing |
| @tanstack/react-query | Server state and data fetching |
| axios | HTTP client |
| react-hook-form | Form handling and validation |

## Known limitations

These are backend TODOs that affect the frontend:

- **No real auth** — login is frontend-only (role stored in localStorage)
- **No edit event** — `PUT /events/:id` not yet implemented; edit UI is not present
- **Read-only qualifications** — `PUT /staff/:id/qualifications` not yet implemented
- **In-memory data** — backend resets all events/assignments on restart
