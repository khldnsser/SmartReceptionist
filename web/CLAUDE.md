# PMS — Practice Management System (Web App)

## What This Is

Next.js 14 (App Router) web application for the clinic doctor.
All data lives in Supabase — the PMS reads and writes the same tables the WhatsApp agent uses.
Doctor edits in the PMS automatically notify the patient via WhatsApp through the agent server's `/internal/notify` endpoint.

## Tech Stack

| Layer | Detail |
|---|---|
| Framework | Next.js 14 App Router (server components + server actions) |
| Auth | Supabase Auth (email/password) via `@supabase/ssr` |
| Styling | Tailwind CSS |
| Calendar | FullCalendar (`@fullcalendar/react`, `daygrid`, `timegrid`, `interaction`) |
| Realtime | Supabase Realtime postgres_changes → `router.refresh()` |

## Auth Flow

1. All routes except `/login` are protected by `src/middleware.ts`.
2. Middleware calls `supabase.auth.getSession()` — redirects to `/login` if no session.
3. Login: server action `signInWithPassword` → session cookie set → redirect to `/calendar`.
4. Logout: server action `signOut` → cookie cleared → redirect to `/login`.
5. Doctor must exist in BOTH `auth.users` (Supabase Auth) AND `public.doctors` table.

## Supabase Client Pattern

| Context | Import | Key | RLS? |
|---|---|---|---|
| Auth check (any server file) | `lib/supabase/server.ts → createClient()` | anon | Yes |
| Data read/write (server action / server component) | `lib/supabase/server.ts → createAdminClient()` | service_role | No |
| Realtime subscription (client component) | `lib/supabase/client.ts → createClient()` | anon | Yes |

**Rule:** use `createClient()` only for `supabase.auth.getUser()`. All data queries use `createAdminClient()` to bypass RLS entirely — the auth check gates page entry.

## Environment Variables (`web/.env.local`)

```
NEXT_PUBLIC_SUPABASE_URL=...          # public — browser-safe
NEXT_PUBLIC_SUPABASE_ANON_KEY=...     # public — anon key (RLS enforces Realtime access)
SUPABASE_SERVICE_ROLE_KEY=...         # server-only — bypasses RLS for data queries
AGENT_URL=http://localhost:3000       # agent server base URL
INTERNAL_API_TOKEN=...                # shared secret for /internal/notify
```

## Doctor → Patient Notification Flow

When the doctor reschedules or cancels via the PMS:
1. Server action writes the change to Supabase via `createAdminClient()`.
2. Server action fetches the patient's `wa_id`.
3. Server action calls `POST {AGENT_URL}/internal/notify` with `{ waId, message }` and `X-Internal-Token` header.
4. Agent server sends the WhatsApp message via Meta Cloud API.

If the notify call fails: log the error, do NOT rollback the DB change.

## Directory Structure

```
src/
├── app/
│   ├── globals.css
│   ├── layout.tsx                          Root layout
│   ├── page.tsx                            Redirects → /calendar
│   ├── login/page.tsx                      Login form
│   ├── auth/
│   │   ├── confirm/route.ts                Email confirmation callback
│   │   └── reset-password/page.tsx
│   ├── actions/
│   │   ├── visit-summaries.ts              saveVisitSummary, deleteVisitSummary
│   │   └── test-results.ts                 uploadTestResult, updateTestResult, deleteTestResult
│   └── (dashboard)/
│       ├── layout.tsx                      Sidebar + main shell
│       ├── calendar/
│       │   ├── page.tsx                    FullCalendar + RealtimeRefresher(appointments)
│       │   └── actions.ts                  createAppointment, updateAppointment, deleteAppointment
│       ├── patients/
│       │   ├── page.tsx                    Patient list + search + RealtimeRefresher(clients, appointments)
│       │   ├── actions.ts                  updateClient
│       │   └── [id]/
│       │       └── page.tsx                Profile, appointments, visit summaries, test results
│       └── settings/page.tsx               Doctor profile
├── components/
│   ├── layout/Sidebar.tsx
│   ├── calendar/
│   │   ├── CalendarView.tsx                FullCalendar wrapper (drag, click, create)
│   │   ├── EventModal.tsx                  View/edit/cancel existing appointment
│   │   └── CreateEventModal.tsx            Book new appointment
│   ├── patients/
│   │   ├── PatientSearch.tsx               URL-based search input
│   │   ├── ProfileEditor.tsx               Inline patient details form
│   │   ├── VisitSummaryPanel.tsx           Create/edit/delete visit summaries
│   │   └── TestResultsPanel.tsx            Upload/view/label/delete test results
│   └── RealtimeRefresher.tsx               Headless realtime → router.refresh()
├── lib/
│   ├── supabase/
│   │   ├── server.ts                       createClient() + createAdminClient()
│   │   └── client.ts                       createBrowserClient()
│   ├── auth-actions.ts                     login / logout server actions
│   ├── notify.ts                           notifyPatient() — calls /internal/notify
│   └── utils.ts                            cn()
└── middleware.ts                           Auth guard (all routes except /login)
```

## Key Components

### RealtimeRefresher
Headless client component. Subscribes to `postgres_changes` on any table (with optional Supabase filter string). Debounces events at 300ms then calls `router.refresh()` to re-run the parent server component.

Used on:
- `/calendar` → watches `appointments` (all changes)
- `/patients` → watches `clients` + `appointments`
- `/patients/[id]` → watches `appointments` filtered to `client_id=eq.{id}`

**Note:** `router.refresh()` re-renders the page from the server, which will reset any open edit forms. This is acceptable since the doctor is the only one editing summaries/results; the agent only changes `appointments`.

### VisitSummaryPanel
Client component. Manages create/edit/delete of `visit_summaries` rows for a patient. Fields: diagnosis, notes, treatment, follow_up. Uses server actions + `revalidatePath` — no optimistic UI.

### TestResultsPanel
Client component. Lists test results with thumbnail/icon. Clicking a result opens a modal: images display via `<img>`, PDFs via `<iframe>`. Supports upload (file sent as FormData to server action → stored in `patient-uploads` Supabase Storage bucket), inline label/note edit, and delete (removes from storage + DB).

Signed URLs are generated server-side at page load (1-hour TTL) and passed down — no extra round-trip to view a file.

### CalendarView
FullCalendar wrapper with dayGrid and timeGrid views. Supports:
- Click existing event → EventModal (view status, mark complete, reschedule, cancel)
- Click empty time slot → CreateEventModal (pick patient, confirm booking)
- Drag event → reschedule via server action
- Beirut timezone enforced across all views

## Server Actions

| File | Actions |
|---|---|
| `app/actions/visit-summaries.ts` | `saveVisitSummary`, `deleteVisitSummary` |
| `app/actions/test-results.ts` | `uploadTestResult`, `updateTestResult`, `deleteTestResult` |
| `(dashboard)/calendar/actions.ts` | `createAppointment`, `updateAppointment`, `deleteAppointment` |
| `(dashboard)/patients/actions.ts` | `updateClient` |
| `lib/auth-actions.ts` | `signIn`, `signOut` |

## Migrations Required in Supabase SQL Editor

Two migrations must be run manually (not auto-applied):

1. **`0006_missed_status.sql`** — adds `'missed'` to `booking_status` CHECK constraint and immediately backfills any past `booked` appointments
2. **`0007_realtime.sql`** — adds `appointments` and `clients` to the `supabase_realtime` publication

## Development

```bash
# From the web/ directory:
npm install
npm run dev       # http://localhost:3001

# Agent server (repo root):
npm run dev       # http://localhost:3000
```

## Port Map

| Service | Port |
|---|---|
| Agent (WhatsApp webhook + /internal/notify) | 3000 |
| PMS (Next.js) | 3001 |
