# Project Context for Claude

## What This Is

AI receptionist for a medical clinic in Beirut. Patients message via WhatsApp (text, audio, image, document). An AI agent handles appointment booking, rescheduling, and cancellation using Supabase Postgres (clients, appointments, conversation history), Google Calendar, and Gmail.

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
                          ▼            ┌───────────────────────────┐
                          ├───────────►│ Supabase Postgres         │
                          │            │  clients                  │
                          │            │  appointments             │
                          │            │  conversation_messages    │
                          │            └───────────────────────────┘
                          ▼
                   WhatsApp text reply
```

## Tech Stack

- **Runtime:** Node.js + TypeScript
- **Server:** Express
- **LLM:** OpenAI GPT-4o-mini (configurable)
- **Audio:** OpenAI Whisper
- **Image:** GPT-4o-mini vision
- **Database:** Supabase Postgres (`@supabase/supabase-js`, service-role key, server-side)
- **Google APIs:** googleapis + service account (Calendar) + OAuth2 (Gmail)
- **Timezone:** Luxon
- **Documents:** pdf-parse, xlsx

## Directory Structure

```
src/
├── config/index.ts        — env var loading + validation (Supabase, OpenAI, Google, WhatsApp, business)
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
│   ├── tools.ts           — 10 tool definitions + executor
│   ├── prompt.ts          — system prompt with datetime injection
│   └── loop.ts            — agentic loop (LLM → tool calls → repeat → reply)
├── app.ts                 — orchestrator: webhook → media → agent → reply
└── server.ts              — Express server with /webhook, /health, /auth/callback

supabase/
└── migrations/
    └── 0001_init.sql      — clients, appointments, conversation_messages + triggers/indexes
```

## Business Rules

- Timezone: `Asia/Beirut` (EET/EEST), system-wide. Per-client timezone is **not** stored.
- Appointments: 30 min default
- Office hours: Mon–Fri 09:00–12:00, 13:00–17:00 (lunch 12:00–13:00 unbookable)
- Min lead time: 24 hours
- Patient identity: `wa_id` (WhatsApp ID) is the natural key; `email` is unique per client.
- Agent offers next 5 available slots.

### Database schema (Supabase Postgres)

- `clients` — `id`, `wa_id` (unique), `email` (unique), `name`, `phone`, `age`, `medical_history`, timestamps
- `appointments` — `id`, `client_id` (FK, cascade), `appointment_date`, `booking_status` (pending/confirmed/cancelled/completed), `calendar_event_id`, `intake_form`, `reminder_sent`, timestamps
- `conversation_messages` — `id`, `wa_id`, `role`, `content`, `tool_calls` (jsonb), `tool_call_id`, `created_at`. Sliding window read: `ORDER BY created_at DESC LIMIT 25`, then reversed in code.

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
| Calendar | `calendar_read` | List events from a time range (availability check) |
| Calendar | `calendar_create` | Create a 30-min event; returns the calendar event id |
| Calendar | `calendar_delete` | Delete an event by id |
| Availability | `get_available_slots` | Compute next 5 open slots, optionally from `preferred_date` |
| Client | `get_client` | Read the current patient's profile |
| Client | `upsert_client` | Create-or-update profile (name/email/phone/age/medical_history) |
| Client | `update_client` | Update specific fields on existing profile |
| Appointment | `create_appointment` | Persist a confirmed appointment (links calendar event id) |
| Appointment | `list_appointments_for_client` | List all appointments for the current patient |
| Appointment | `update_appointment` | Reschedule, cancel, or otherwise update an appointment |
| Email | `gmail_send` | Send a confirmation/update email |

## Migration Plan Status

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

Stages 1–7 produce a working end-to-end system. Stages 8–9 are production-readiness.

## Key Decisions

- **Memory is Supabase-backed** sliding window (last 25 messages per `wa_id`, ordered by `created_at`). Persists across restarts. Old rows are kept — the window is just the query.
- **Supabase as the single data store** for clients, appointments, and conversation history. Google Sheets has been fully retired.
- **Google Calendar stays** as the authoritative event store for the clinic UI; `calendar_event_id` on appointments keeps the two in sync.
- **LLM is configurable** — `OPENAI_MODEL` env var, default `gpt-4o-mini`.
- **Audio uses transcription** (not translation) — preserves original language for Lebanese patients.
- **Service-role Supabase key** is used server-side only; never expose to clients.
- **Debug logging** is currently enabled in `app.ts` — remove for production.

## N8N Source of Truth

The original N8N workflow is in `FYP.json`. Key details extracted:
- System prompt is in the "Knowledge Base Agent" node (first node in the file)
- Calendar ID: references a `@group.calendar.google.com` address
- Original storage: "Appointments" Google Sheet with 8 columns, email as unique key (now replaced by Supabase tables — see `Database-Creation.md`)
- Agent tools: Calendar Read/Create/Delete, Sheets Read/Add/Update, Gmail Send (Sheets tools are now Supabase-backed `get_client`/`upsert_client`/`update_client`/`create_appointment`/`list_appointments_for_client`/`update_appointment`)
- Memory: buffer window of 15 messages, keyed by `memory_{wa_id}` (now 25 messages, Supabase-backed)
- Model: GPT-4o-mini
- Supported doc types: CSV, HTML, Calendar, RTF, TXT, XML, PDF, JSON, XLS, XLSX
