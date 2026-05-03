# Clinic AI Receptionist — Project Root

## What This Is

Two-part system for a medical clinic in Beirut:

1. **WhatsApp AI Agent** (repo root) — patients message via WhatsApp (text, audio, image, document). An AI agent handles appointment booking, rescheduling, cancellation, and read-only access to their own clinical records.
2. **PMS (Practice Management System)** (`web/`) — Next.js web app for the doctor to manage the calendar, patient profiles, visit summaries, test results, and medical records.

Both parts share a single Supabase Postgres database. **No Google APIs** are used anywhere — Calendar, Gmail, and Sheets were fully removed and replaced by Supabase + WhatsApp direct messaging.

---

## Architecture

```
WhatsApp Cloud API → POST /webhook
  └─ Parse message type
       ├─ text     → pass through
       ├─ audio    → Whisper transcription
       ├─ image    → GPT-4o-mini vision (extracted; content NOT relayed to patient)
       └─ document → PDF/XLSX/CSV/text extraction (same suppression rule)
                          │
                          ▼
                   AI Agent (GPT-4o-mini)
                   Sliding-window memory (last 25 msgs, Supabase-backed, keyed by wa_id)
                   Tools: see § Agent Tools below
                          │
                          ▼
               ┌─────────────────────────────────┐
               │  Supabase Postgres               │
               │  clients, appointments           │
               │  conversation_messages           │
               │  visit_summaries + addendums     │
               │  visit_vital_signs               │
               │  test_results                    │
               │  client_allergies/problems/      │
               │  medications/family_history/     │
               │  social_history                  │
               │  doctors, audit_logs             │
               └────────────┬────────────────────┘
                            │ reads/writes
                            ▼
                     PMS (Next.js, web/)
                     Doctor-facing UI
                     POST /internal/notify  ← doctor changes → WhatsApp notification
                     POST /internal/send-message ← ad-hoc doctor→patient message
```

---

## Tech Stack

### Agent server (repo root)

| Layer | Detail |
|---|---|
| Runtime | Node.js + TypeScript |
| Server | Express |
| LLM | OpenAI GPT-4o-mini (configurable via `OPENAI_MODEL`) |
| Audio | OpenAI Whisper |
| Image/doc | GPT-4o-mini vision + pdf-parse + xlsx |
| Database | Supabase Postgres (`@supabase/supabase-js`, service-role key) |
| Config validation | Zod (fails fast on missing env vars at startup) |
| Logging | Pino (pretty in dev, JSON in prod) |
| Timezone | Luxon |
| Scheduler | node-cron |

### PMS (`web/`)

| Layer | Detail |
|---|---|
| Framework | Next.js 14 App Router (server components + server actions) |
| Auth | Supabase Auth via `@supabase/ssr` |
| Styling | Tailwind CSS |
| Calendar | FullCalendar (daygrid, timegrid, list, interaction) |
| Realtime | Supabase Realtime `postgres_changes` → `router.refresh()` |

---

## Directory Structure

### Agent server

```
src/
├── core/
│   ├── config.ts          Zod-validated env config (single source of truth)
│   ├── logger.ts          Pino structured logger (pretty dev / JSON prod)
│   └── errors.ts          AppError, NotFoundError, ValidationError, UnauthorizedError
├── config/
│   └── index.ts           Re-export shim → src/core/config (backwards compat)
├── whatsapp/
│   ├── types.ts           IncomingMessage, webhook payload types
│   ├── webhook.ts         GET verification + POST payload parsing
│   ├── sender.ts          sendTextMessage(), markAsRead()
│   └── media.ts           downloadMedia() via WhatsApp Cloud API
├── media/
│   ├── audio.ts           Whisper transcription
│   ├── image.ts           Vision analysis (content passed to agent; NEVER relayed to patient)
│   ├── document.ts        PDF/XLSX/XLS/CSV/JSON/text extraction
│   ├── router.ts          routeMessageToText() + media upload to Supabase Storage
│   └── storage.ts         Supabase Storage upload helper
├── db/
│   ├── client.ts          Supabase service-role client singleton
│   ├── clients.ts         getClientByWaId/Email, upsertClient (phone linking), updateClient
│   ├── appointments.ts    createAppointment, listAppointmentsForClient, updateAppointment
│   ├── clinical.ts        Privacy-filtered SELECTs for 6 clinical tables (patient-facing cols only)
│   ├── test_results.ts    saveTestResult
│   └── visit_summaries.ts Doctor-only — NOT used by agent
├── agent/
│   ├── loop.ts            Agentic loop: LLM → tool calls → repeat → reply
│   ├── memory.ts          Supabase-backed sliding window (last 25 msgs per wa_id)
│   ├── prompt.ts          System prompt with datetime injection
│   ├── privacy.ts         Documents privacy boundary: patient-facing vs doctor-only
│   └── tools/
│       ├── index.ts       TOOL_DEFINITIONS + executeTool() dispatcher
│       ├── clients.ts     get_client, upsert_client, update_client
│       ├── appointments.ts get_available_slots, create/list/reschedule/cancel appointment
│       ├── clinical.ts    6 read-only clinical tools (see § Agent Tools)
│       ├── test_results.ts list_test_results_for_client
│       └── notifications.ts send_whatsapp_confirmation
├── tools/
│   └── availability.ts    Next-N-slots calculator (pure logic, no I/O)
├── notifications/          Parallel helpers (not wired into main flow — to be consolidated)
│   ├── send.ts
│   └── templates.ts
├── scheduler/
│   ├── index.ts           Starts cron jobs on server boot
│   ├── reminders.ts       Appointment reminders (every 5 min)
│   └── missed.ts          Marks past booked appointments 'missed' (daily midnight Beirut)
├── app.ts                 Orchestrator: webhook → media → agent → reply
└── server.ts              Express: /webhook, /health, /internal/notify, /internal/send-message
```

---

## Agent Tools

| Category | Tool | Purpose |
|---|---|---|
| Client | `get_client` | Read current patient's profile |
| Client | `upsert_client` | Create-or-update profile |
| Client | `update_client` | Update specific profile fields |
| Availability | `get_available_slots` | Next N open slots |
| Appointment | `create_appointment` | Persist a confirmed appointment |
| Appointment | `list_appointments_for_client` | List all appointments for the patient |
| Appointment | `reschedule_appointment` | Atomically cancel old + book new |
| Appointment | `cancel_appointment` | Cancel an appointment |
| Clinical (read-only) | `get_my_allergies` | Substance + reaction |
| Clinical (read-only) | `get_my_medications` | Active meds: name, dose, frequency |
| Clinical (read-only) | `get_my_problems` | Active conditions: problem text |
| Clinical (read-only) | `get_my_family_history` | Relation + condition |
| Clinical (read-only) | `get_my_social_history` | Status fields only |
| Clinical (read-only) | `get_my_test_results_list` | File list: name, date, patient note |
| Notification | `send_whatsapp_confirmation` | Send confirmation message |

**Privacy:** `visit_summaries`, `visit_vital_signs`, and doctor-written notes are **never** exposed to the agent. See `src/agent/privacy.ts` and `src/db/clinical.ts`.

---

## Privacy Architecture

Two-layer enforcement:

1. **DB layer** — `src/db/clinical.ts` uses narrow `SELECT` columns that exclude `doctor_note`, `diagnosis`, vital readings, etc.
2. **Prompt layer** — System prompt lists what the agent may and may not relay. Clinical interpretation questions are always redirected to the doctor.

**"Extract but suppress" (media):** Images and PDFs are extracted and passed to the agent as context. The system prompt forbids the agent from relaying any extracted content to the patient.

---

## Database Schema

| Table | Key fields |
|---|---|
| `clients` | `id`, `wa_id` (unique, nullable), `email` (unique), `name`, `phone`, `age`, `medical_history` |
| `appointments` | `id`, `client_id`, `appointment_date`, `booking_status` (booked/cancelled/completed/missed), `appointment_type` (initial/follow_up/procedure/telemedicine), `duration_minutes`, `intake_form` |
| `conversation_messages` | `id`, `wa_id`, `role`, `content`, `tool_calls` (jsonb), `tool_call_id` |
| `visit_summaries` | `id`, `client_id`, `appointment_id`, `diagnosis`, `notes`, `treatment`, `follow_up`, `signed_at`, `signed_by`. Immutable once signed. |
| `visit_summary_addendums` | `id`, `summary_id`, `added_by`, `content` |
| `visit_vital_signs` | `id`, `appointment_id`, `client_id`, BP, HR, temp, weight, height, BMI (auto-computed), O2 sat |
| `test_results` | `id`, `client_id`, `storage_path`, `mime_type`, `file_name`, `file_size_bytes`, `patient_note`, `doctor_label`, `doctor_note`, `uploaded_via` (whatsapp/web) |
| `doctors` | `id` (refs auth.users), `email`, `name` |
| `client_allergies` | `client_id`, `substance`, `reaction`, `severity` |
| `client_problems` | `client_id`, `problem`, `icd10_code`, `status` (active/resolved/inactive) |
| `client_medications` | `client_id`, `drug_name`, `dose`, `frequency`, `start_date`, `end_date` |
| `client_family_history` | `client_id`, `relation`, `condition` |
| `client_social_history` | one row per client: smoking/alcohol/drug status, occupation, living situation |
| `audit_logs` | `action_type`, `actor_source` (doctor/agent/system), `resource_type`, `resource_id`, `before`/`after` (jsonb) |

Storage bucket: `patient-uploads` (private, 50 MB, images + PDF)

---

## Environment Variables

### Agent server (`.env`)

```
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_API_TOKEN=
WHATSAPP_VERIFY_TOKEN=
WHATSAPP_APP_SECRET=          # optional

OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini      # optional

SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=

INTERNAL_API_TOKEN=           # shared secret for /internal/* endpoints

TIMEZONE=Asia/Beirut          # optional, all defaults shown
APPOINTMENT_DURATION_MIN=30
OFFICE_HOURS_AM_START=09:00
OFFICE_HOURS_AM_END=12:00
OFFICE_HOURS_PM_START=13:00
OFFICE_HOURS_PM_END=17:00
MIN_BOOKING_LEAD_HOURS=24
SLOTS_TO_OFFER=5
REMINDER_LEAD_HOURS=24
PORT=3000
```

### PMS (`web/.env.local`)

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
AGENT_URL=http://localhost:3000
INTERNAL_API_TOKEN=           # must match agent server value
```

---

## Business Rules

- Timezone: `Asia/Beirut` everywhere. Per-client timezone not stored.
- Default appointment duration: 30 min; overridden by `duration_minutes`.
- Appointment types: `initial`, `follow_up`, `procedure`, `telemedicine`
- Office hours: Mon–Fri 09:00–12:00, 13:00–17:00. Lunch + weekends are never bookable.
- Min booking lead: 24 hours from now.
- Agent offers next 5 slots.
- `wa_id` is null for manually-created PMS patients. Set on first WhatsApp contact via phone-based fallback in `upsertClient`.

---

## Migrations (run in Supabase SQL editor, in order)

| File | What it adds |
|---|---|
| `0001_init.sql` | clients, appointments, conversation_messages |
| `0002_pms_schema.sql` | visit_summaries, test_results, doctors |
| `0003_appointments_simplify.sql` | Simplifies appointment schema |
| `0004_storage_bucket.sql` | patient-uploads bucket |
| `0005_rls.sql` | RLS policies |
| `0006_missed_status.sql` | 'missed' booking status + backfill |
| `0007_realtime.sql` | Realtime on appointments + clients |
| `0008_medical_record.sql` | Clinical record tables |
| `0009_vital_signs.sql` | visit_vital_signs + BMI trigger |
| `0010_summary_signing.sql` | Immutable-once-signed trigger |
| `0011_audit_log.sql` | audit_logs table |
| `0012_appointment_types.sql` | appointment_type enum + duration_minutes |

---

## Development

```bash
# Agent server (port 3000)
npm install && npm run dev

# PMS (port 3001)
cd web && npm install && npm run dev
```
