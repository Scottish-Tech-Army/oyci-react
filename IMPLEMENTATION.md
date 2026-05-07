# OYCI Staff Assignment Management System - Implementation Guide

## Overview
A professional React + Material-UI web application for managing staff assignments to youth events at OYCI (Ochils Youths Community Improvement).

## ✅ What's Implemented

### Core Infrastructure
- **React 19** with **Vite** for fast development
- **Material-UI (MUI)** for professional UI components
- **TypeScript** for type safety
- **Context API** for global state management
- **Date handling** with dayjs
- **Express API** for persistence and migration
- **SQLite on disk** for durable state storage

### Main Features

#### 1. **Dashboard**
   - Overview of total events, staff, locations, and assignments
   - Warning alerts for events with insufficient staff
   - Upcoming events table
   - Staff utilization statistics

#### 2. **Locations Management**
   - Add, edit, delete locations
   - Track location name, address, and capacity
   - Full CRUD with modal dialogs

#### 3. **Event Types Management**
   - Define activity types (Basketball, Drama, etc.)
   - Set duration, required qualifications, minimum staff needed
   - Multi-select qualifications support

#### 4. **Staff Management**
   - Add staff with qualifications and availability
   - Track available hours per week
   - Add/remove holiday periods with reasons
   - Holiday date range management

#### 5. **Events (Instances) Management**
   - Create specific event instances (date + time + location + type)
   - Link event types to specific dates and locations
   - Track max attendees and event notes

#### 6. **Smart Staff Assignment System**
   - View all events and assigned staff
   - Automatic filtering of available staff based on:
     - Required qualifications (if any)
     - Date availability (not on holiday)
     - Already assigned staff exclusion
   - Hover tooltip showing staff's weekly schedule and hours committed
   - Quick assignment dialog with staff availability view

#### 7. **Calendar View**
   - Month view of all events
   - Events displayed on calendar with staff count
   - List view of events for the selected month
   - Visual indicators for event staffing status (green/red)

#### 8. **Utility Functions**
   - Date formatting and calculation helpers
   - Staff weekly workload calculation
   - Qualification matching
   - Email preview generation (formatted text)

## 📁 Project Structure

```
src/
├── App.tsx                    # Main app with navigation
├── index.css                  # Global styles
├── main.tsx                   # Entry point
│
├── types/
│   └── index.ts              # TypeScript interfaces
│
├── context/
│   └── AppContext.tsx         # Global state management
│
├── utils/
│   └── helpers.ts            # Date, format, calculation utilities
│
└── pages/
    ├── DashboardPage.tsx      # Overview dashboard
    ├── LocationsPage.tsx      # Location CRUD
    ├── EventTypesPage.tsx     # Event type CRUD
    ├── StaffPage.tsx          # Staff management with holidays
    ├── EventsPage.tsx         # Event instance CRUD
    ├── AssignmentsPage.tsx    # Staff-to-event assignments
    └── CalendarPage.tsx       # Calendar & list view
```

## 🚀 Getting Started

### Installation
```bash
npm install  # Dependencies already installed
```

### Development
```bash
npm run dev          # Start the Vite frontend
npm run dev:server   # Start the Express API on http://localhost:3001
```

### Production Build
```bash
npm run build  # Creates optimized build in dist/
```

## 🎯 Key Data Types

- **Location**: Name, address, capacity
- **EventType**: Name, description, duration, required qualifications
- **Staff**: Name, email, phone, qualifications, available hours/week, holidays
- **Event**: Event type, location, date, time, max attendees
- **Assignment**: Connects staff to events with hours allocated
- **Qualification**: Union type of available skills (Basketball Coach, Drama Facilitator, etc.)

## 💡 Key Features Explained

### Staff Availability Filtering
When assigning staff to an event, the system automatically:
1. Hides already-assigned staff
2. Filters by required qualifications (if any)
3. Excludes staff on holiday during that date
4. Shows weekly hours committed vs available

### Weekly Hours Tracking
Hover over a staff member's name during assignment to see:
- Total hours already committed that week
- List of other events they're assigned to
- Available hours remaining

### Holiday Management
- Staff can have multiple holiday periods
- Events filter out unavailable staff during holidays
- Holiday reasons can be tracked

## 🔄 State Management

Using React Context API with:
- Global state for all entities
- Memoized context value (no unnecessary re-renders)
- Hooks for easy component access (`useAppContext()`)
- API-backed persistence using the `AppStateSnapshot` contract
- One-time migration from the legacy browser-local SQLite payload

## 📝 Notes for Future Enhancements

1. **Backend Integration**: Expand beyond snapshot persistence into domain-specific APIs
2. **Schema Normalization**: Split the single snapshot payload into relational tables if multi-user workflows require it
3. **Email Sending**: Implement actual email generation (currently text preview)
4. **Advanced Filtering**: Search, date ranges, staff filters
5. **Reports**: Export assignments, staff utilization reports
6. **Notifications**: Real-time alerts for assignments
7. **User Authentication**: Login system for different roles

## ⚠️ Known Limitations

- Persistence is still snapshot-based, so concurrent edits can overwrite each other
- No user authentication or roles
- Email generation is text preview only
- Calendar view is basic month view
- Some existing repo-wide lint issues remain in unrelated pages

## 🎨 Styling

All components use MUI theming and responsive design with:
- Breakpoints: xs, sm, md, lg, xl
- Consistent color scheme
- Material Design principles
- Professional card-based layouts

---

**Status**: ✅ Persistence implementation in progress  
**Build**: Frontend and backend compile successfully  
**Persistence**: SQLite file on local filesystem
