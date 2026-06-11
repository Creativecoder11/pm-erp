# Jamroll PM

Jamroll PM is an enterprise project management application in the spirit of
Asana — organizations, projects, kanban boards, tasks with subtasks,
comments, attachments, custom fields, reporting, and role-based access
control.

## Tech stack

- **Framework:** Next.js 16 (App Router, Server Components)
- **Language:** TypeScript
- **UI:** Tailwind CSS v4, shadcn/ui, lucide-react icons
- **State management:** Zustand
- **Database/ORM:** MongoDB via Mongoose
- **Auth:** NextAuth (Auth.js) with the MongoDB adapter
- **Forms/validation:** React Hook Form + Zod
- **Drag & drop:** dnd-kit (kanban board)
- **Charts:** Recharts (reports/dashboards)
- **Email:** Nodemailer
- **File uploads:** UploadThing
- **Real-time:** Socket.IO (server-side emit helpers are in place; the
  custom server wiring for live updates is still in progress)

## Getting started

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.local` and fill in real values for your environment (see the
   table below).

3. Run the development server:

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

4. (Optional) Seed the database with demo data:

   ```bash
   npm run seed
   ```

   This creates a demo organization, 5 users, 3 projects (each with the
   default kanban columns), and 30 tasks spread across them. Login
   credentials are printed to the console when the script finishes.
   Running it again clears any previously seeded data for the same demo
   organization (`jamroll-demo`) before re-creating it.

## Environment variables

These are read from `.env.local` (Next.js loads this automatically in dev
and production; the seed script loads it manually via `dotenv`).

| Variable               | Description                                              |
| ----------------------- | --------------------------------------------------------- |
| `MONGODB_URI`           | MongoDB connection string                                |
| `NEXTAUTH_SECRET`       | Secret used by NextAuth to sign/encrypt tokens & cookies |
| `NEXTAUTH_URL`          | Base URL of the app (used by NextAuth callbacks)         |
| `GOOGLE_CLIENT_ID`      | OAuth client ID for "Sign in with Google"                |
| `GOOGLE_CLIENT_SECRET`  | OAuth client secret for "Sign in with Google"            |
| `UPLOADTHING_SECRET`    | UploadThing API secret for file/attachment uploads       |
| `UPLOADTHING_APP_ID`    | UploadThing application ID                               |
| `SMTP_HOST`             | SMTP server host for outgoing email (e.g. invites)       |
| `SMTP_PORT`             | SMTP server port                                         |
| `SMTP_USER`             | SMTP username                                            |
| `SMTP_PASS`             | SMTP password / app password                             |

## Architecture overview

- `src/app/(auth)` — public authentication routes (login, register, etc.),
  rendered without the dashboard shell.
- `src/app/(dashboard)` — the authenticated app shell (sidebar, header,
  command palette) and all dashboard pages: home, projects, project
  kanban/list/reports, my tasks, workload, settings.
- `src/app/api` — Next.js route handlers backing the app (auth, projects,
  tasks, comments, notifications, organizations, etc.).
- `src/models` — Mongoose schemas/models (`User`, `Organization`, `Project`,
  `Task`, `Comment`, and related types).
- `src/lib` — shared server utilities: database connection (`db.ts`), auth
  configuration (`auth.ts`/`auth.config.ts`), RBAC checks (`rbac.ts`),
  email, notifications, audit logging, Socket.IO emit helpers, and
  validation schemas.
- `src/store` — Zustand stores for client-side state (tasks, projects,
  notifications, etc.).
- `src/components` — UI components, organized by domain (kanban, projects,
  shared, layout) plus shadcn primitives in `src/components/ui`.
- `src/types` — shared TypeScript types used across the client and API
  responses.
- `scripts/seed.ts` — standalone seed script (run with `npm run seed`).

Real-time updates are partially wired: `src/lib/socket-emit.ts` provides
helpers for emitting events to organization/project/user rooms via a global
Socket.IO server instance, but the custom server entrypoint that creates and
attaches that instance is still in progress.
