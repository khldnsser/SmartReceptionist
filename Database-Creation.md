# Database Migration Plan: Google Sheets → Supabase

Migrating from Google Sheets (long-term) and in-memory `Map` (short-term) to **Supabase Postgres** for both. The current `tools/sheets.ts` and `agent/memory.ts` will be replaced.

> **Google Sheets is being fully retired.** After this migration, **no data is written to or read from the Sheet** — clients, appointments, and conversation history all live in Supabase. The `GOOGLE_SHEET_ID` / `GOOGLE_SHEET_NAME` env vars and the `googleapis` Sheets calls are removed in Stage 8. Google **Calendar** and **Gmail** stay (they're not databases — Calendar is the booking source of truth for the clinic UI, Gmail is the outbound mailer).
>
> **Per-client timezone is dropped.** No `time_zone` column on `clients`. The system-wide `TIMEZONE=Asia/Beirut` env var still governs appointment scheduling — every client is assumed to be on clinic time.

---

## Implementation choices

### Type 1 — Long-term memory: Supabase Postgres (relational tables)
Native fit. Free tier (500 MB DB, 2 GB bandwidth) is more than enough for a course project. Foreign keys, constraints, and SQL all just work.

### Type 2 — Short-term memory: Same Supabase Postgres, separate `conversation_messages` table
A separate Redis/Upstash instance was considered but rejected for a course project: extra service, extra credentials, extra failure mode, no real win at this scale. Postgres handles the sliding window cleanly via `ORDER BY created_at DESC LIMIT 25`. One service, one credential pair, persistent across restarts.

## Decisions (confirmed)

- **Region**: Frankfurt (`eu-central-1`) — lowest latency from Beirut on the free tier.
- **Existing data**: starting fresh. No migration from the current Google Sheet. A seed script with dummy data is added as Stage 9.
- **Tool naming**: agent tools are renamed for clarity (`get_client`, `upsert_client`, `create_appointment`, `update_appointment`, `list_appointments_for_client`). The system prompt is updated accordingly. Final summary doc captures all renames.

---

## Schema

### `clients`
| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | `default gen_random_uuid()` |
| `wa_id` | `text` UNIQUE NOT NULL | WhatsApp user ID — natural identity |
| `email` | `text` UNIQUE | Patient ID per business rules |
| `name` | `text` | |
| `phone` | `text` | |
| `age` | `int` | |
| `medical_history` | `text` | Free-form; updated as agent learns more |
| `created_at` | `timestamptz` | `default now()` |
| `updated_at` | `timestamptz` | `default now()` |

### `appointments`
| Column | Type | Notes |
|---|---|---|
| `id` | `uuid` PK | `default gen_random_uuid()` |
| `client_id` | `uuid` FK → `clients.id` | `ON DELETE CASCADE` |
| `appointment_date` | `timestamptz` NOT NULL | |
| `booking_status` | `text` | `confirmed` \| `cancelled` \| `completed` \| `pending` (CHECK constraint) |
| `calendar_event_id` | `text` | Google Calendar event ID for sync |
| `intake_form` | `text` | Optional |
| `reminder_sent` | `boolean` | Default `false` |
| `created_at` | `timestamptz` | `default now()` |
| `updated_at` | `timestamptz` | `default now()` |

Index: `(client_id, appointment_date DESC)`

### `conversation_messages` (sliding-window memory)
| Column | Type | Notes |
|---|---|---|
| `id` | `bigserial` PK | |
| `wa_id` | `text` NOT NULL | Indexed |
| `role` | `text` NOT NULL | `user` \| `assistant` \| `tool` \| `system` |
| `content` | `text` | Nullable (assistant tool-call messages may have null content) |
| `tool_calls` | `jsonb` | Assistant tool-call payloads |
| `tool_call_id` | `text` | For tool-result messages |
| `created_at` | `timestamptz` NOT NULL | `default now()` |

Index: `(wa_id, created_at DESC)`

**Sliding-window read**: `SELECT … WHERE wa_id = $1 ORDER BY created_at DESC LIMIT 25`, then reverse in code so chronological order is preserved before sending to the LLM. Old rows are kept (no destructive trim) — the window is just the query.

---

## Stages

Legend: **[USER]** = you take action and tell me when done. **[CLAUDE]** = I implement. **[BOTH]** = I prepare, you run.

---

### Stage 0 — Plan review **[USER]** ⏸ pause
You read this document and either approve or request changes. Nothing else happens until you say "go".

---

### Stage 1 — Supabase project creation **[USER]** ⏸ pause

1. Sign up at [supabase.com](https://supabase.com) (free tier, GitHub login is fine).
2. **New project** → name it (e.g., `fyp-clinic`), set a strong database password (save it somewhere), pick region **`eu-central-1` (Frankfurt)**. If Frankfurt is unavailable on the free tier, fall back to whichever European region the dashboard lets you pick.
3. Wait ~2 min for provisioning.
4. **Project Settings → API**, copy:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon public** key
   - **service_role** key (keep this secret — server-only)
5. Tell me when done. Do **not** paste the keys in chat — just confirm. I'll add the variable names to `.env.example` and you'll fill in your `.env` locally.

---

### Stage 2 — Schema creation **[BOTH]** ⏸ pause

1. I will write a single SQL migration file (`supabase/migrations/0001_init.sql`) with the schema above.
2. You open Supabase **SQL Editor** → paste the file's contents → **Run**.
3. Verify in **Table Editor** that `clients`, `appointments`, `conversation_messages` exist.
4. Tell me when done.

---

### Stage 3 — Dependencies and config **[CLAUDE]**

I will:
- Install `@supabase/supabase-js`.
- Add `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to `src/config/index.ts` and `.env.example`.
- Create `src/db/client.ts` exporting a configured Supabase client (service-role, server-side).

You: add the two new vars to your local `.env`.

---

### Stage 4 — Long-term memory services **[CLAUDE]**

Create `src/db/clients.ts` and `src/db/appointments.ts` exposing typed functions that mirror what `tools/sheets.ts` does today, but against Postgres:
- `getClientByWaId`, `getClientByEmail`, `upsertClient`, `updateClient`
- `createAppointment`, `getAppointmentsForClient`, `updateAppointmentStatus`, `markReminderSent`

No agent-facing changes yet — just the data layer.

---

### Stage 5 — Wire agent tools to the new services (with renames) **[CLAUDE]**

Update `src/agent/tools.ts` — replace the three Sheets tools with cleanly-named equivalents:

| Old (Sheets-flavored) | New | Backed by |
|---|---|---|
| `read_sheet_row_by_email` | `get_client` | `db/clients.ts` |
| `add_sheet_row` | `upsert_client` | `db/clients.ts` |
| `update_sheet_row_by_email` | `update_client` | `db/clients.ts` |
| _(was bundled into update)_ | `create_appointment` | `db/appointments.ts` |
| _(was bundled into update)_ | `update_appointment` | `db/appointments.ts` |
| _(was bundled into read)_ | `list_appointments_for_client` | `db/appointments.ts` |

Also update `src/agent/prompt.ts` so the system prompt references the new tools and the new schema (clients + appointments as separate concepts).

---

### Stage 6 — Persistent sliding-window memory **[CLAUDE]**

Replace `src/agent/memory.ts`:
- `getHistory(waId)` → `SELECT … LIMIT 25 ORDER BY created_at DESC`, reversed.
- `appendMessage(waId, msg)` → `INSERT`.
- Drop the in-memory `Map`.

The agent loop in `src/agent/loop.ts` should not need changes if the interface stays the same — I'll keep it that way.

---

### Stage 7 — Local end-to-end test **[BOTH]** ⏸ pause

1. I confirm `npx tsc --noEmit` passes.
2. You run `npm run dev` + `ngrok http 3000` (update Meta webhook if URL changed).
3. From WhatsApp:
   - Send "hi" → agent should ask for your details (new client flow).
   - Provide name + email.
   - Verify a row appears in Supabase `clients` table.
   - Book an appointment → verify row in `appointments` and event in Google Calendar.
   - Restart `npm run dev` (kill + restart).
   - Send another message — agent should remember you and the previous conversation (last 25 messages).
4. Report back what worked / what didn't.

---

### Stage 8 — Cleanup: fully retire Google Sheets **[CLAUDE]**

Once Stage 7 passes, the Sheet is gone for good:
- Delete `src/tools/sheets.ts`.
- Remove all `googleapis` Sheets imports/calls from the codebase.
- Remove `GOOGLE_SHEET_ID` and `GOOGLE_SHEET_NAME` from `src/config/index.ts`, `.env.example`, and your local `.env`.
- Remove any leftover references to the Sheet in `src/agent/prompt.ts`.
- The Google Sheet itself can be archived or deleted on your end — the app no longer touches it.

(Documentation updates — `CLAUDE.md`, `SETUP.md` — are folded into Stage 10's final summary.)

---

### Stage 9 — Seed dummy data **[BOTH]** ⏸ pause

1. I write `supabase/seed.sql` with a handful of realistic dummy rows: 3–5 clients, a few past + future appointments per client, and a couple of sample conversation snippets so the sliding-window memory has something to read.
2. You open Supabase **SQL Editor** → paste `seed.sql` → **Run**.
3. Verify rows in Table Editor.
4. Optional: send a WhatsApp message from the phone number that matches one of the seeded `wa_id` values to confirm the agent recognizes that "client".

---

### Stage 10 — Final documentation summary **[CLAUDE]**

Wrap-up pass to capture everything we built:
- Update `CLAUDE.md`:
  - Architecture diagram: Supabase replaces the Sheets box; memory module shows Supabase backing.
  - Tech stack: add `@supabase/supabase-js`, drop Sheets row from external services table.
  - Env table: drop `GOOGLE_SHEET_ID` / `GOOGLE_SHEET_NAME`, add `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY`.
  - Migration plan status table: mark Stages 1–6 done, this migration as a new completed stage.
- Update `SETUP.md`:
  - Drop the "Google Sheets" section entirely.
  - Add a "Supabase" section: project creation, getting the URL + service-role key, running the migration SQL, running the seed.
- Append a **"Migration Summary"** section to `Database-Creation.md` documenting:
  - Tool rename map (table from Stage 5).
  - Final schema (the three tables).
  - Env var diff (added/removed).
  - Files added (`src/db/client.ts`, `src/db/clients.ts`, `src/db/appointments.ts`, `supabase/migrations/0001_init.sql`, `supabase/seed.sql`) and files deleted (`src/tools/sheets.ts`).
  - One-paragraph "what changed and why" suitable for a course report.

---

## What stays untouched

- Google **Calendar** integration (still authoritative for events — not a database).
- Google **Gmail** integration (outbound mailer only).
- WhatsApp webhook + media routing.
- Agent loop structure.

## What goes away

- Google **Sheets** as a data store — fully removed in Stage 8.
- In-memory `Map` in `agent/memory.ts` — replaced by Supabase-backed sliding window in Stage 6.
- Per-client timezone field — dropped from schema; clinic timezone is global.

---

## Ready to start

All three open questions are answered (see **Decisions** above). Awaiting your **"go"** to begin **Stage 1** (Supabase project creation — your action).
