# School ID - School Operations PWA

## Overview
A full school operations PWA (Progressive Web App) for staff with QR/barcode scanning, real-time student state tracking, live dashboard, activities management, student profiles, and admin configuration.

## Architecture

### Monorepo Structure (pnpm workspaces)
- `artifacts/api-server/` - Express 5 + Socket.IO backend API
- `artifacts/school-id/` - React + Vite PWA frontend (staff portal)
- `lib/db/` - Drizzle ORM schema + PostgreSQL database access
- `lib/api-zod/` - Generated Zod validators from OpenAPI spec
- `lib/api-client-react/` - Generated React Query hooks from OpenAPI spec
- `lib/api-spec/openapi.yaml` - OpenAPI 0.1.0 specification

### Technology Stack
- **Frontend**: React 19, Vite, TailwindCSS v4, wouter routing, React Query, PWA (vite-plugin-pwa)
- **Backend**: Express 5, Socket.IO, JWT auth (jsonwebtoken + bcryptjs), Drizzle ORM
- **Database**: PostgreSQL (Replit managed)
- **Code generation**: Orval (OpenAPI → Zod + React Query)

## Running Services
- **API Server**: Port 8080, path `/api`
- **Frontend**: Path `/`, Vite dev server

## Database Schema
Tables:
- `users` - Staff accounts (role: admin/staff)
- `students` - Student records with QR codes (`SCID-{studentId}` format)
- `scan_events` - Scan history (gate_in, gate_out, class, event, assembly, activity, detention, club)
- `activities` - Activities/events/clubs (status: upcoming/active/completed/cancelled)
- `activity_members` - Students enrolled in activities
- `activity_attendance` - Attendance records per activity
- `behavior_logs` - Merit/demerit records
- `behavior_categories` - Categories for behavior tracking
- `school_settings` - School configuration (name, times, timezone)

## Student State Engine
States: `not_arrived` | `on_campus` | `in_class` | `at_event` | `checked_out` | `unaccounted`

State transitions based on scan type:
- `gate_in` → on_campus
- `gate_out` / `checkout` → checked_out
- `class` → in_class
- `event` / `assembly` / `activity` / `detention` / `club` → at_event
- No scans → not_arrived

## API Routes
- `POST /api/auth/login` - JWT login
- `GET /api/auth/me` - Current user
- `GET/POST /api/students` - List/create students
- `GET /api/students/:id` - Student profile with today's timeline
- `PATCH /api/students/:id` - Update student
- `GET /api/students/lookup/:qrCode` - Lookup by QR/ID
- `POST /api/scan` - Process a scan (updates student state, broadcasts via Socket.IO)
- `GET /api/scan/events` - List scan events
- `GET /api/dashboard/summary` - Live dashboard KPIs + feed
- `GET /api/dashboard/feed` - Recent activity feed
- `GET/POST /api/activities` - List/create activities
- `GET/PATCH/DELETE /api/activities/:id` - Activity detail/update/delete
- `GET /api/activities/:id/attendance` - Activity attendance
- `GET/POST /api/behavior/logs` - Behavior logs
- `GET/POST /api/behavior/categories` - Behavior categories
- `GET/PATCH /api/settings` - School settings
- `GET /api/users` - List users
- `POST /api/users` - Create user

## Real-Time
Socket.IO on path `/api/socket.io` emits:
- `state_changed` - When a student's state changes
- `dashboard_update` - Triggers dashboard refresh

## Frontend Pages (Bottom Tab Navigation)
1. **Scan** (`/scan`) - QR/barcode scan interface, manual ID entry, demo "Simulate Scan" buttons (SCID-STU1001/1002/1003), contextual post-scan action buttons (Check In, Check Out, Class, Event, Merit, Demerit), recent scan result display
2. **Dashboard** (`/dashboard`) - Exceptions panel first (unaccounted/missing), Live KPIs grid, status breakdown, Socket.IO real-time updates
3. **Activities** (`/activities`) - Type filter tabs (All/Class/Event/Assembly/Club/Detention), activity detail with attendance + Start Scanning shortcut, create/edit modal
4. **Students** (`/students`) - Student list with search/filter by grade/class/state, student profile with today's timeline + behavior log
5. **Admin** (`/admin`) - School settings, staff accounts, behavior categories CRUD, Add Student form, CSV import UI, Sign Out

## API Client
All frontend pages use generated React Query hooks from `@workspace/api-client-react` (generated via Orval from OpenAPI spec). No raw fetch calls. All interactive elements have `data-testid` attributes. Auth token injected via `setAuthTokenGetter` in `src/lib/api.ts`.

## Authentication
- JWT-based with 24h expiration
- Token stored in localStorage (`school-id-token`)
- Demo credentials: admin/admin123, staff1/staff123, staff2/staff123

## Demo Data (Seeded)
- 96 students across grades 8-12 (8A/8B/8C, 9A/9B/9C, 10A/10B, 11A/11B, 12A/12B)
- 3 staff accounts (admin, staff1, staff2)
- 72 gate_in scan events for today
- 3 activities (Morning Assembly - active, Inter-House Sports - upcoming, Science Club - upcoming)
- 6 behavior categories (3 merit, 3 demerit)
- School: "Westbrook Academy", 07:30-14:30, Africa/Johannesburg

## Status Color Coding
- Green = On Campus
- Blue = In Class
- Yellow = At Event
- Grey/Slate = Not Arrived
- Muted = Checked Out
- Red = Unaccounted

## PWA Configuration
- Service worker with auto-update
- Offline cache for assets
- Installable on mobile devices
- Optimized for portrait orientation
