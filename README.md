# Clinic AI Receptionist

Clinic AI Receptionist is a WhatsApp-based patient communication and clinic management system. Patients can message the clinic to book, reschedule, or cancel appointments, while the doctor manages the schedule, patient records, visit summaries, test results, and notifications from a web dashboard. The system uses an AI agent for patient-facing conversation and a shared Supabase database as the source of truth for both the agent and the PMS.

Two-part clinic system:

- Agent server: Express + TypeScript service that receives WhatsApp webhooks, runs the AI receptionist, stores conversation state, and sends patient messages.
- PMS web app: Next.js dashboard in `web/` for the doctor to manage patients, appointments, visit summaries, test results, and medical records.

Both services use the same Supabase Postgres project. Google Calendar, Gmail, and Google Sheets are not part of the current application.

## Architecture

```text
WhatsApp Cloud API
  -> POST /webhook
  -> media/text extraction
  -> AI agent loop
  -> Supabase Postgres
  -> WhatsApp reply

PMS web app
  -> Supabase Auth
  -> Supabase Postgres
  -> POST /internal/notify or /internal/send-message on the agent
```

Core backend folders:

- `src/core`: config, logger, shared errors.
- `src/infra`: external clients.
- `src/repositories`: database access.
- `src/domain`: pure business rules.
- `src/services`: application workflows.
- `src/agent`: prompt, memory, guardrails, and tools.
- `src/http`: Express routes and middleware.
- `src/jobs`: scheduled reminders and missed-appointment processing.

Core web folders:

- `web/src/app`: Next.js App Router pages, routes, and server actions.
- `web/src/features`: feature-owned UI and actions.
- `web/src/components`: shared UI components.
- `web/src/lib`: Supabase clients, auth helpers, notifications, utilities.

## Requirements

- Node.js 20 LTS for local development and Docker images.
- npm.
- Supabase project with the migrations in `supabase/migrations` applied in order.
- WhatsApp Cloud API credentials.
- OpenAI API key.
- Docker and Docker Compose for containerized runs.

## Environment

Create local env files from the examples:

```bash
cp .env.example .env
cp web/.env.example web/.env.local
```

Agent server env:

```text
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_API_TOKEN=
WHATSAPP_VERIFY_TOKEN=
WHATSAPP_APP_SECRET=
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
INTERNAL_API_TOKEN=
TIMEZONE=Asia/Beirut
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

Web app env:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
AGENT_URL=http://localhost:3000
INTERNAL_API_TOKEN=
SERVER_ACTION_ALLOWED_ORIGINS=localhost:3001
```

`INTERNAL_API_TOKEN` must match in both env files. In Docker Compose, the web service uses `AGENT_URL=http://agent:3000`.

## Local Development

Install and run the agent:

```bash
npm install
npm run dev
```

Install and run the web app:

```bash
cd web
npm install
npm run dev
```

Ports:

- Agent: `http://localhost:3000`
- Web: `http://localhost:3001`
- Health check: `http://localhost:3000/health`

## Docker

Build and run both services:

```bash
docker compose up --build
```

Run in the background:

```bash
docker compose up --build -d
```

Stop services:

```bash
docker compose down
```

Check the agent:

```bash
curl http://localhost:3000/health
```

Open the PMS at `http://localhost:3001`.

## Supabase

Run migrations in order from `supabase/migrations`:

```text
0001_init.sql
0002_pms_schema.sql
0003_appointments_simplify.sql
0004_storage_bucket.sql
0005_rls.sql
0006_missed_status.sql
0007_realtime.sql
0008_medical_record.sql
0009_vital_signs.sql
0010_summary_signing.sql
0011_audit_log.sql
0012_appointment_types.sql
```

The app expects these main tables and resources: `clients`, `appointments`, `conversation_messages`, `visit_summaries`, `visit_summary_addendums`, `visit_vital_signs`, `test_results`, `doctors`, clinical record tables, `audit_logs`, and the private `patient-uploads` storage bucket.

## Validation

Run backend validation:

```bash
npm run build
```

Run web validation:

```bash
npm --prefix web run lint
npm --prefix web run type-check
npm --prefix web run build
```

Run the combined check:

```bash
npm run check
```

## Operational Notes

- The backend starts scheduled jobs in-process. Do not run multiple backend replicas unless the scheduler is separated or made singleton-safe.
- The agent may extract text from uploaded media for context, but patient-facing clinical interpretation must remain bounded by the prompt and privacy rules.
- Service-role Supabase keys are server-only. Never expose them to the browser or bake them into Docker images.
