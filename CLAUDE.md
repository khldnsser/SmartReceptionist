# Project Context for Claude

## What This Is

Two-part system for a medical clinic in Beirut:

1. **WhatsApp AI Agent** — patients message via WhatsApp (text, audio, image, document). An AI agent handles appointment booking, rescheduling, and cancellation.
2. **PMS (Practice Management System)** — Next.js web app for the doctor to manage the calendar, patient profiles, visit summaries, and test results.

Both systems share the same Supabase Postgres database.

Migrated from an N8N workflow (`FYP.json`) to a standalone TypeScript/Node.js codebase. The data layer was further migrated from Google Sheets + an in-memory `Map` to Supabase Postgres (see `Database-Creation.md`).

## Architecture

```
WhatsApp Webhook POST
  └─ Parse message type
       ├─ text     → pass through
       ├─ audio    → Whisper transcription
       ├─ image    → GPT-4o-mini vision
       └─ document → PDF/XLSX/CSV/text extraction
                          │
                          ▼
                   AI Agent (GPT-4o-mini)
                   Sliding-window memory (last 25 msgs, Supabase-backed, keyed by wa_id)
                   Tools: calendar CRUD, client CRUD, appointment CRUD, gmail send
                          │
                          ▼            ┌────────────────────────────────────┐
                          ├───────────►│ Supabase Postgres                  │
                          │            │  clients                           │
                          │            │  appointments                      │
                          │            │  conversation_messages              │
                          │            │  visit_summaries                   │
                          │            │  test_results                      │
                          │            │  doctors                           │
                          │            └────────────────────────────────────┘
                          ▼                          ▲
                   WhatsApp text reply               │ reads/writes
                                               PMS (Next.js)
                                               web/ directory
                                               Doctor-facing UI
```

## Tech Stack

### Agent server (repo root)
- **Runtime:** Node.js + TypeScript
- **Server:** Express
- **LLM:** OpenAI GPT-4o-mini (configurable via `OPENAI_MODEL`)
- **Audio:** OpenAI Whisper
- **Image:** GPT-4o-mini vision
- **Database:** Supabase Postgres (`@supabase/supabase-js`, service-role key)
- **Google APIs:** googleapis + service account (Calendar) + OAuth2 (Gmail)
- **Timezone:** Luxon
- **Documents:** pdf-parse, xlsx
- **Scheduler:** node-cron

### PMS (web/)
- **Framework:** Next.js 14 App Router (server components + server actions)
- **Auth:** Supabase Auth via `@supabase/ssr`
- **Styling:** Tailwind CSS
- **Calendar:** FullCalendar
- **Realtime:** Supabase Realtime postgres_changes

## Directory Structure

### Agent server

```
src/
├── config/index.ts        — env var loading + validation
├── whatsapp/
│   ├── types.ts           — IncomingMessage, webhook payload types
│   ├── webhook.ts         — GET verification + POST payload parsing
│   ├── sender.ts          — sendTextMessage(), markAsRead()
│   └── media.ts           — downloadMedia() via WhatsApp Cloud API
├── media/
│   ├── audio.ts           — Whisper transcription
│   ├── image.ts           — vision analysis
│   ├── document.ts        — PDF/XLSX/XLS/CSV/JSON/text extraction
│   └── router.ts          — routeMessageToText() dispatcher
├── tools/
│   ├── calendar.ts        — Google Calendar list/create/delete
│   ├── gmail.ts           — Gmail send via OAuth2
│   └── availability.ts    — next-N-slots calculator
├── db/
│   ├── client.ts          — Supabase client (service-role)
│   ├── clients.ts         — getClientByWaId/Email, upsertClient, updateClient
│   └── appointments.ts    — createAppointment, listAppointmentsForClient, updateAppointment
├── agent/
│   ├── memory.ts          — Supabase-backed sliding window (last 25 msgs per wa_id)
│   ├── tools.ts           — 11 tool definitions + executor
│   ├── prompt.ts          — system prompt with datetime injection
│   └── loop.ts            — agentic loop (LLM → tool calls → repeat → reply)
├── scheduler/
│   ├── index.ts           — starts node-cron jobs on server boot
│   ├── reminders.ts       — sends appointment reminders every 5 min
│   └── missed.ts          — marks past booked appointments as 'missed' daily at midnight Beirut
├── app.ts                 — orchestrator: webhook → media → agent → reply
└── server.ts              — Express server with /webhook, /health, /auth/callback, /internal/notify

supabase/
└── migrations/
    ├── 0001_init.sql              — clients, appointments, conversation_messages
    ├── 0002_pms_schema.sql        — visit_summaries, test_results, doctors
    ├── 0003_appointments_simplify.sql
    ├── 0004_storage_bucket.sql    — patient-uploads bucket (50 MB, images + PDF)
    ├── 0005_rls.sql               — RLS policies (doctors see all; agent uses service role)
    ├── 0006_missed_status.sql     — adds 'missed' to booking_status enum + backfill
    └── 0007_realtime.sql          — enables Realtime publication on appointments + clients
```

## Business Rules

- Timezone: `Asia/Beirut` (EET/EEST), system-wide. Per-client timezone is **not** stored.
- Appointments: 30 min default duration
- Office hours: Mon–Fri 09:00–12:00, 13:00–17:00 (lunch 12:00–13:00 unbookable)
- Min lead time: 24 hours
- Patient identity: `wa_id` (WhatsApp ID) is the natural key; `email` is unique per client.
- Agent offers next 5 available slots.

### Database schema (Supabase Postgres)

- `clients` — `id`, `wa_id` (unique), `email` (unique), `name`, `phone`, `age`, `medical_history`, timestamps
- `appointments` — `id`, `client_id` (FK cascade), `appointment_date`, `booking_status` (`booked`/`cancelled`/`completed`/`missed`), `calendar_event_id`, `intake_form`, `reminder_sent`, timestamps
- `conversation_messages` — `id`, `wa_id`, `role`, `content`, `tool_calls` (jsonb), `tool_call_id`, `created_at`
- `visit_summaries` — `id`, `client_id`, `appointment_id`, `diagnosis`, `notes`, `treatment`, `follow_up`, timestamps
- `test_results` — `id`, `client_id`, `storage_path`, `mime_type`, `file_name`, `file_size_bytes`, `patient_note`, `doctor_label`, `doctor_note`, `uploaded_via` (`whatsapp`/`web`), `created_at`
- `doctors` — `id` (refs auth.users), `email`, `name`, `created_at`
- Storage bucket: `patient-uploads` (private, 50 MB limit, images + PDF)

### Missed appointments

The scheduler marks any `booked` appointment whose `appointment_date` is before today (midnight Beirut) as `missed`. Runs:
- Once on agent server startup (catches anything that slipped through)
- Daily at 21:00 UTC (= midnight Beirut)

## External Services

| Service | Auth Method | Config Keys |
|---|---|---|
| WhatsApp Cloud API | Bearer token | `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_API_TOKEN`, `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_APP_SECRET` |
| OpenAI | API key | `OPENAI_API_KEY`, `OPENAI_MODEL` |
| Supabase | Service-role key | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` |
| Google Calendar | Service account JSON | `GOOGLE_SERVICE_ACCOUNT_KEY_FILE`, `GOOGLE_CALENDAR_ID` |
| Gmail | OAuth2 refresh token | `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN`, `GMAIL_SENDER` |

## Agent Tools

Defined in `src/agent/tools.ts`:

| Category | Tool | Purpose |
|---|---|---|
| Calendar | `calendar_read` | List events from a time range |
| Calendar | `calendar_create` | Create a 30-min event; returns the calendar event id |
| Calendar | `calendar_delete` | Delete an event by id |
| Availability | `get_available_slots` | Compute next 5 open slots, optionally from `preferred_date` |
| Client | `get_client` | Read the current patient's profile |
| Client | `upsert_client` | Create-or-update profile |
| Client | `update_client` | Update specific fields on existing profile |
| Appointment | `create_appointment` | Persist a confirmed appointment |
| Appointment | `list_appointments_for_client` | List all appointments for the current patient |
| Appointment | `update_appointment` | Reschedule, cancel, or otherwise update an appointment |
| Email | `gmail_send` | Send a confirmation/update email |

## Migration Plan Status

### Agent server
| Stage | Description | Status |
|---|---|---|
| 1 | Project scaffolding, config, types | Done |
| 2 | WhatsApp integration (webhook, sender, media) | Done |
| 3 | Media processing (audio, image, document, router) | Done |
| 4 | Tools (calendar, gmail, availability) | Done |
| 5 | AI agent (memory, tools, prompt, loop) | Done |
| 6 | Orchestrator (app.ts, server.ts) | Done |
| 7 | Supabase migration (clients, appointments, conversation memory) | Done |
| 8 | Deployment & infrastructure | Not started |
| 9 | Testing & validation | Not started |

### PMS (web/)
| Stage | Description | Status |
|---|---|---|
| 10 | Calendar page (FullCalendar, create/edit/cancel appointments) | Done |
| 11 | Patients list + patient profile page | Done |
| 12 | Visit summary editor (create/edit/delete per patient) | Done |
| 13 | Test results panel (upload, view images/PDFs, label/note) | Done |
| 14 | Realtime sync (Supabase Realtime → router.refresh()) | Done |

## Key Decisions

- **Memory is Supabase-backed** sliding window (last 25 messages per `wa_id`). Persists across restarts.
- **Supabase as the single data store** for all tables. Google Sheets fully retired.
- **Google Calendar stays** as the authoritative event store; `calendar_event_id` keeps DB and Calendar in sync.
- **LLM is configurable** — `OPENAI_MODEL` env var, default `gpt-4o-mini`.
- **Audio uses transcription** (not translation) — preserves original language for Lebanese patients.
- **Service-role key** is server-side only (agent + PMS server actions). Never exposed to the browser.
- **PMS data queries use `createAdminClient()`** (service role) to bypass RLS. `createClient()` is used only for `supabase.auth.getUser()` auth checks.
- **Debug logging** is currently enabled in `app.ts` — remove for production.

## Pending Before Production

1. Run `supabase/migrations/0006_missed_status.sql` in the Supabase SQL editor (adds 'missed' status + backfills past appointments)
2. Run `supabase/migrations/0007_realtime.sql` in the Supabase SQL editor (enables Realtime on appointments + clients)
3. Deploy agent server (Stage 8)
4. Final QA pass (Stage 9)

## N8N Source of Truth

The original N8N workflow is in `FYP.json`:
- System prompt: "Knowledge Base Agent" node (first node in file)
- Calendar ID: `@group.calendar.google.com` address
- Original storage: "Appointments" Google Sheet (now replaced by Supabase)
- Memory: buffer window of 15 messages keyed by `memory_{wa_id}` (now 25 messages, Supabase-backed)
