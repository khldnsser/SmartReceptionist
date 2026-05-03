# PMS Improvements — Implementation Plan

20 improvements across 4 tiers, organized into 8 build stages. Each stage ends at a natural pause point. **🛑 HUMAN** markers indicate where to stop and let the user verify/decide before continuing.

---

## Stage 1 — Clinical record foundation (Tier 1, items 1–4)

Build the structured medical record + audit infrastructure. Everything else depends on this.

### 1.1 — Structured medical record schema

Write migration `supabase/migrations/0008_medical_record.sql`:
- `client_allergies` (substance, reaction, severity enum: mild/moderate/severe, notes)
- `client_problems` (problem text, icd10_code nullable, onset_date, status enum: active/resolved/inactive, notes)
- `client_medications` (drug_name, dose, frequency, start_date, end_date nullable, indication, notes)
- `client_family_history` (relation, condition, notes)
- `client_social_history` (one row per client: smoking_status, alcohol_use, drug_use, occupation, living_situation, free-text fields)
- All FK to `clients(id) ON DELETE CASCADE`, indexed on `client_id`
- RLS policies matching existing tables (doctor sees all, agent uses service role)

**🛑 HUMAN: review the schema before applying.** Once you approve, run it in Supabase SQL editor.

### 1.2 — Vital signs schema

Write migration `supabase/migrations/0009_vital_signs.sql`:
- `visit_vital_signs` (appointment_id FK, client_id FK, systolic_bp, diastolic_bp, heart_rate, temperature_c, weight_kg, height_cm, bmi, o2_saturation, notes, captured_at)
- BMI as a generated column from weight/height
- Indexes on `appointment_id`, `client_id`, `captured_at`
- RLS matching existing tables

**🛑 HUMAN: run in Supabase SQL editor.**

### 1.3 — Visit summary signing

Write migration `supabase/migrations/0010_summary_signing.sql`:
- ALTER `visit_summaries`: add `signed_at` timestamp, `signed_by` UUID FK to `auth.users`
- New table `visit_summary_addendums` (summary_id FK, added_by FK, content text, created_at)
- Trigger on `visit_summaries` UPDATE: if `signed_at` IS NOT NULL on the OLD row, raise exception (immutable once signed)

**🛑 HUMAN: run in Supabase SQL editor.**

### 1.4 — Audit log

Write migration `supabase/migrations/0011_audit_log.sql`:
- `audit_logs` table (id, action_type, actor_user_id nullable, actor_source enum: doctor/agent/system, resource_type, resource_id, before jsonb, after jsonb, created_at)
- Postgres trigger function `log_audit()` that fires AFTER INSERT/UPDATE/DELETE on key tables: `clients`, `appointments`, `visit_summaries`, `client_medications`, `client_allergies`, `client_problems`, `test_results`
- Trigger reads `current_setting('app.actor_user_id', true)` so server actions can SET LOCAL the actor before mutations

**🛑 HUMAN: run in Supabase SQL editor. Verify a test mutation creates an audit row.**

### 1.5 — DB layer for new tables

Add files in `web/src/db/`:
- `medical-record.ts` (CRUD for allergies, problems, medications, family/social history)
- `vital-signs.ts` (insert + getByClient last N)
- `addendums.ts` (insert + listBySummary)
- `audit.ts` (helper to SET LOCAL `app.actor_user_id` from server actions)

No human checkpoint here — pure code.

### 1.6 — Server actions for medical record

Add `web/src/app/actions/medical-record.ts` with: `addAllergy`, `updateAllergy`, `deleteAllergy`, and the equivalents for problems/medications/family/social. Each action:
- Calls `auth()`, throws on no user
- SET LOCAL the actor_user_id (so audit trigger captures who)
- Calls db layer
- `revalidatePath` for the patient page

No human checkpoint.

### 1.7 — Server actions for vital signs + signing + addendums

- `captureVitalSigns(formData)` → inserts into `visit_vital_signs`
- `signVisitSummary(summaryId)` → sets `signed_at = now()`, `signed_by = current_user`
- `addAddendum(summaryId, content)` → inserts addendum

**🛑 HUMAN: try a sign+addendum flow end-to-end via SQL or a quick test page before building the UI.**

### 1.8 — Update CLAUDE.md

Reflect the new tables in the schema section so future model context is accurate.

**END OF STAGE 1.** 🛑 HUMAN: confirm everything works at the data layer before we touch UI.

---

## Stage 2 — Clinical record UI

Wire the new tables into the patient profile.

### 2.1 — MedicalRecordPanel component

`web/src/components/patients/MedicalRecordPanel.tsx`:
- Five collapsible sections: Allergies, Problems, Medications, Family History, Social History
- Each section: list view + add/edit forms
- Severity badges (red/orange/green for severe/moderate/mild)
- "Active medications" filter (end_date IS NULL)

### 2.2 — VitalSignsPanel component

- Form to capture vitals, shown contextually inside the appointment row in `AppointmentsWithSummary`
- "Latest vitals" card on the profile (most recent reading)
- Sparkline component for BP/weight trends — use plain inline SVG, no chart library

### 2.3 — VisitSummaryPanel updates

- If `signed_at` is set: render readonly with a green "Signed by [doctor] on [date]" banner; hide Edit, replace with "Add addendum"
- Addendum thread renders below summary with timestamps and authors
- Unsigned: existing edit flow, plus a "Sign and lock" button

### 2.4 — Wire into patient profile page

Add tabs (or sections) for Medical Record + Vitals. Order: Profile → Medical Record → Appointments → Vitals trend → Visit summaries → Test results.

**🛑 HUMAN: open a patient profile and click through everything. Verify the UX feels right before moving on.**

**END OF STAGE 2.**

---

## Stage 3 — Patient record PDF export (Tier 1, item 5)

### 3.1 — PDF generator

Pick library: `@react-pdf/renderer` (recommended — JSX-based) or `pdfkit` (imperative).

**🛑 HUMAN: which one?** Default is `@react-pdf/renderer` if you don't answer.

### 3.2 — Build the export

`web/src/lib/patient-pdf.tsx`: renders profile + active allergies + active medications + active problems + last 5 visit summaries (with signed/unsigned status) + last vital signs.

### 3.3 — Server action + route

`web/src/app/api/patients/[id]/export/route.ts`: GET returns PDF stream with filename `<patient-name>-record-<date>.pdf`.

### 3.4 — UI button

"Export PDF" button on patient profile header.

**🛑 HUMAN: download a sample PDF, eyeball the layout. Iterate if needed.**

**END OF STAGE 3.**

---

## Stage 4 — UX polish (Tier 2, items 6–8)

Quick wins that ripple across the whole app. Do these together so we touch each screen once.

### 4.1 — ConfirmDialog component

`web/src/components/ConfirmDialog.tsx` reusing existing modal styles. Props: title, description, confirmText, variant (default/danger), onConfirm, onCancel.

### 4.2 — Toast system

`web/src/components/Toast.tsx` with `ToastProvider` context. `useToast()` hook. Mount provider in `(dashboard)/layout.tsx`. Variants: success/error/info. Auto-dismiss after 4s.

### 4.3 — Replace all `window.confirm` calls

Search-and-replace: `TestResultsPanel`, `VisitSummaryPanel`, `EventModal`, anywhere else. Each becomes a stateful `<ConfirmDialog>`.

### 4.4 — Wire toasts into server actions

Server actions return `{ ok, error? }`. Components fire `addToast` based on result. Replace inline "✓ Saved" with toasts.

### 4.5 — Skeleton components

`web/src/components/Skeleton.tsx` exporting `<SkeletonRow>`, `<SkeletonCard>`, `<SkeletonText>`. Use on lists during `useTransition` `isPending` and in `loading.tsx` files for route-level loading.

**🛑 HUMAN: walk through the app, verify confirms/toasts/skeletons feel cohesive. Note anything that still flickers.**

**END OF STAGE 4.**

---

## Stage 5 — New views (Tier 2, items 9–10)

### 5.1 — Patient timeline

New tab on patient profile. Server-side fetch all of: appointments, visit summaries, test results, addendums. Merge by date, render as vertical timeline with type-specific icons. Each item links to its detail.

### 5.2 — Today dashboard

New route `web/src/app/(dashboard)/today/page.tsx`. Shows: today's appointments grouped by status (upcoming, in progress, completed), plus a "Next 7 days" preview. Make this the default landing page after login.

**🛑 HUMAN: decide if Today should replace Calendar as the default route, or live alongside.**

### 5.3 — Sidebar update

Add "Today" link, reorder so Today is first.

**END OF STAGE 5.**

---

## Stage 6 — Mobile responsive (Tier 2, item 11)

### 6.1 — Sidebar collapse

Below 768px: fixed bottom nav OR slide-in drawer with hamburger trigger. Pick one.

**🛑 HUMAN: bottom nav (iOS-feel) or hamburger drawer? Default: hamburger.**

### 6.2 — Patient profile responsive

Replace inline grid styles with CSS classes that stack at 768px. Tabs become a horizontal scroll on narrow screens.

### 6.3 — Calendar mobile view

FullCalendar's `listWeek` view as default on mobile (the month grid is unusable below 768px).

### 6.4 — Modal sizing

All modals: `max-width: min(720px, 95vw)`.

**🛑 HUMAN: test on actual phone (not just devtools). Both iOS Safari and Android Chrome.**

**END OF STAGE 6.**

---

## Stage 7 — Functional gaps (Tier 3, items 12–14)

### 7.1 — Manual patient creation

"+ New patient" button on `/patients` opens a modal. Required: name. Optional: email, phone, age. Inserts into `clients` with `wa_id = NULL`. Patient is searchable immediately. When they later message WhatsApp, the agent matches by phone (already implemented in `upsertClient`) and fills in `wa_id`.

**🛑 HUMAN: confirm the wa_id matching logic in `src/db/clients.ts` actually links by phone — if it only matches by wa_id, we need to extend it.**

### 7.2 — Ad-hoc WhatsApp messaging

- Agent server: add `POST /internal/send-message` endpoint. Auth: shared secret header (set in env). Body: `{ wa_id, text }`. Calls `sendTextMessage`.
- Web app: server action `sendAdHocMessage(clientId, text)` calls the agent endpoint via the secret. Logs to `conversation_messages` with `role: 'assistant'` so the agent sees it in future context.
- UI: "Message patient" button on patient profile, opens a textarea modal.

**🛑 HUMAN: define the shared secret env var + decide whether ad-hoc messages should appear in the patient's WhatsApp conversation history (yes — they should — but confirm).**

### 7.3 — Appointment types

- Migration `0012_appointment_types.sql`: ALTER `appointments` ADD `appointment_type` enum (initial, follow_up, procedure, telemedicine), default 'follow_up'. ADD `duration_minutes` int with check constraint.
- Backfill existing rows with 'follow_up' / 30
- Calendar event color by type
- Create/edit modal: type dropdown, auto-fills duration but lets user override
- Update agent's `create_appointment` tool to accept `appointment_type` (default to follow_up if unspecified)

**🛑 HUMAN: confirm the four types and their default durations match what the doctor actually does.**

**END OF STAGE 7.**

---

## Stage 8 — Recurring + waitlist (Tier 3, item 15)

This one is bigger. Defer until Stages 1–7 are deployed and stable.

### 8.1 — Recurring appointments

- Migration: add `recurrence_rule` text (RRULE format) and `recurrence_parent_id` self-FK to `appointments`
- New server action: when creating an appointment with a recurrence rule, materialize the next 3 months of instances
- Cron job: every Sunday, materialize the next month for any active recurrence

### 8.2 — Waitlist

- Migration: `waitlist` table (client_id, requested_window_start, requested_window_end, priority, notes, created_at, fulfilled_at nullable)
- When an appointment is cancelled, query the waitlist for matches in that window. Notify the doctor (in-app + WhatsApp message to the doctor's number? or just the dashboard?)
- Manual "+ Add to waitlist" button

**🛑 HUMAN: lots of design decisions here. Walk through the flow before building. This stage may justify its own dedicated planning session.**

**END OF STAGE 8.**

---

## Stage 9 — Security & operations (Tier 4, items 16–20)

Can run in parallel with Stages 4–7. Items 16, 17, 19 are quick.

### 9.1 — 2FA on login (item 16)

- Enable TOTP in Supabase dashboard → Authentication → MFA
- Add MFA enrollment flow on first login: show QR + recovery codes
- Add MFA challenge step in login flow when user has factor enrolled

**🛑 HUMAN: enable in Supabase dashboard. Enroll your own account first, save recovery codes somewhere safe.**

### 9.2 — Session timeout (item 17)

- Middleware in `web/src/middleware.ts`: track `lastActivity` cookie, redirect to login if > 30 min stale, refresh on every request
- Show a "session expiring in 2 minutes" toast at the 28-min mark

### 9.3 — File hardening (item 18)

- Server-side MIME sniff: read first bytes of uploaded file, verify against extension. Reject mismatches.
- Image dimension check before upload (max 5000×5000)
- Virus scan: Supabase Edge Function calling VirusTotal API, triggered on storage upload event

**🛑 HUMAN: VirusTotal needs an API key + has rate limits. Decide: VirusTotal (easy, 4 req/min free tier) vs ClamAV in a Docker sidecar (more setup, no rate limit). Default: VirusTotal.**

### 9.4 — Error monitoring (item 19)

- Install `@sentry/nextjs` in `web/` and `@sentry/node` in agent server
- Wrap server actions with Sentry context
- Set up alert: > 5 errors in 5 min → email

**🛑 HUMAN: Sentry account + DSN needed. Free tier (5k events/mo) is plenty. Or pick self-hosted GlitchTip if you don't want a third party — same SDK.**

### 9.5 — Backup verification (item 20)

One-time task:
- In Supabase dashboard: trigger manual backup
- Spin up a free-tier project from that backup
- Run row counts on `clients`, `appointments`, `visit_summaries` — match production
- Document the restore steps in `DEPLOYMENT.md`
- Schedule: do this monthly (calendar reminder)

**🛑 HUMAN: this is mostly clicking through Supabase UI. Block 30 min and do it.**

**END OF STAGE 9.**

---

## Stage 10 — Agent clinical data access (read-only via WhatsApp)

Extend the WhatsApp agent so patients can ask about their own record over WhatsApp, and so multi-modal test result uploads via WhatsApp persist to the database. **The PMS remains the only place clinical data is created or edited by the doctor.** The agent is read-only with one exception: patients may upload test results.

This stage can run any time after Stage 1 ships (the structured tables exist).

### 10.1 — Privacy boundary definition

Create `src/agent/privacy.ts` (new file). Two strictly-separated classifications:

**🟢 Patient-facing (agent MAY return to the patient who owns the record):**

| Table | Fields the agent may expose |
|---|---|
| `clients` | `name`, `phone`, `email`, `age` (already exposed via `get_client`) |
| `client_allergies` | `substance`, `reaction` only |
| `client_medications` (active only — `end_date IS NULL`) | `drug_name`, `dose`, `frequency` |
| `client_problems` (active only) | `problem` text |
| `client_family_history` | `relation`, `condition` |
| `client_social_history` | status fields (smoking/alcohol/drug), `occupation`, `living_situation` |
| `appointments` | their own appointments (already exposed) |
| `test_results` | `file_name`, `created_at`, `patient_note` (NEVER doctor's label/note, NEVER file contents) |

**🔴 Doctor-only (agent must NEVER expose):**
- All `visit_summaries` (diagnosis, notes, treatment, follow_up, signed_at, signed_by)
- All `visit_summary_addendums`
- All `visit_vital_signs` rows (BP, HR, weight, BMI, temperature, O2 sat — patients ask their doctor for these)
- `client_allergies`: `severity`, `notes`
- `client_medications`: non-active rows, `indication`, `notes`
- `client_problems`: `icd10_code`, `notes`, resolved/inactive rows
- `client_family_history`: `notes`
- `client_social_history`: free-text detail fields
- `test_results`: `doctor_label`, `doctor_note`, the file contents themselves
- `audit_logs` (entirely)
- The legacy `clients.medical_history` blob (the agent should stop reading this — structured tables replace it)

The privacy module exposes type-safe selectors that strip doctor-only columns server-side, so they can never leak through agent tools by accident.

**🛑 HUMAN: review the privacy split. Anything you'd add to "doctor-only" or move to "patient-facing"?**

### 10.2 — Read-only tools for the agent

Add to `src/agent/tools.ts` (all scoped automatically by the conversation's `wa_id` — no patient can read another's record):

- `get_my_allergies` — active allergies, substance + reaction
- `get_my_medications` — currently-active meds, name + dose + frequency
- `get_my_problems` — active problems, text only
- `get_my_family_history` — relation + condition
- `get_my_social_history` — status fields only
- `get_my_test_results_list` — list of file names + dates the patient uploaded or that the doctor uploaded for them (for "do you have my last blood test?" — but never the contents or doctor's interpretation)

All implementations route through the privacy selectors from 10.1. Every call writes an `audit_logs` row: `actor_source='agent'`, `action_type='read'`, `resource_type=<table>`, `resource_id=<row id>`.

### 10.3 — Test result upload via WhatsApp (the one write path)

Patients may upload images/PDFs as test results — this is the **only** clinical write the agent can perform.

Flow:
1. Existing media handler (`src/media/document.ts` / `src/media/image.ts`) downloads the file from WhatsApp Cloud API
2. New step: save to Supabase Storage at `patient-uploads/<client_id>/<uuid>.<ext>` (matching the bucket layout the PMS uses)
3. Insert row in `test_results` with `uploaded_via='whatsapp'`, `mime_type`, `file_size_bytes`, `file_name`, `patient_note=<caption text the patient sent alongside, if any>`. `doctor_label` and `doctor_note` left NULL — the doctor fills those in via the PMS later.
4. Agent confirms receipt verbally: *"Got it — I've saved this to your record for the doctor to review."*
5. Agent **does NOT** describe, interpret, or comment on the file's contents.

**🛑 HUMAN: vision/PDF extraction policy on uploaded medical files. Two options:**
- **(a) Blind the agent (safest):** skip vision/PDF text extraction entirely for documents the patient frames as test results. Agent never sees the contents, so it can't accidentally leak interpretation back. Doctor reviews the file in the PMS.
- **(b) Extract but suppress:** still run extraction (so future doctor-handoff features can use it) but the system prompt forbids relaying any extracted content. Higher leakage risk if the prompt is ever bypassed.

Default: **(a)** unless you have a specific use case for (b).

### 10.4 — System prompt updates

Update `src/agent/prompt.ts` with explicit clinical-privacy rules. Add a new section after the existing booking instructions:

```
=== Clinical record access ===

You can answer questions about the patient's OWN record using these tools:
- "what am I allergic to?" → get_my_allergies
- "what medications am I on?" → get_my_medications
- "what conditions are on my chart?" → get_my_problems
- "what's my family history?" → get_my_family_history

You CANNOT discuss, summarize, share, or interpret:
- Visit summaries, diagnoses, doctor's notes, treatment plans, follow-up instructions
- Vital signs (blood pressure, heart rate, weight, BMI, temperature, oxygen saturation)
- Lab values, test result contents, or any clinical interpretation
- Severity ratings, ICD codes, or any prognosis

If the patient asks about any of these, reply:
"Those details are best discussed with the doctor at your next visit. I can help you book one if you'd like."

=== Test result uploads ===

When the patient sends a document or image:
- Save it to their record (use the upload tool)
- Acknowledge: "I've saved this to your record for the doctor to review."
- Do NOT describe what you see in the image or document
- Do NOT interpret values, results, or images
- Do NOT volunteer medical advice based on the upload

If they ask "what does it say?" or "is this normal?" → defer to the doctor.
```

### 10.5 — Manual upload path on the PMS (verify, no new code)

`TestResultsPanel` already supports doctor-side upload. Verify that WhatsApp-uploaded results show up alongside doctor uploads, and add a small `uploaded_via` badge so the doctor can tell them apart at a glance (a one-line UI tweak, not a structural change).

### 10.6 — Test cases

Document expected behavior in `agent-clinical-tests.md`:

| Patient sends | Agent should |
|---|---|
| "What am I allergic to?" | Call `get_my_allergies`, list substance + reaction |
| "What meds am I on?" | Call `get_my_medications`, list active only |
| "What's my dosage of X?" | Read from `get_my_medications`, return dose + frequency |
| "What did the doctor say last visit?" | Decline — redirect to next appointment |
| "What's my BP?" / "What was my last weight?" | Decline — vitals are doctor-only |
| "Is my cholesterol high?" / "Am I diabetic?" | Decline interpretation. May confirm an active problem on chart only if framed as "what conditions am I treated for" |
| Photo of blood test | Save to `test_results`, acknowledge, do NOT comment on values |
| Photo of pill bottle | Save to `test_results` (or decline if not appropriate), do NOT comment |
| "Can you tell me what this scan shows?" | Decline — defer to doctor |
| "Send me a copy of my last visit summary" | Decline — visit summaries are not patient-facing through this channel |

**🛑 HUMAN: review test cases. Add edge cases specific to your practice (mental health framing, pediatric proxies, prescription refill requests).**

### 10.7 — Verify isolation

Manually verify the agent cannot read another patient's data:
- The wa_id context scopes every tool — confirm with a deliberate test (try to coax the agent into saying another patient's name/data)
- Confirm `get_client` and the new tools all derive `client_id` from `wa_id` lookup, never from a parameter the LLM could control

**END OF STAGE 10.**

---

## How to use this plan with another model

Hand it: *"Work through PLAN.md starting at Stage X.Y. Stop at every 🛑 HUMAN marker and report back. Don't skip ahead."*

The model will execute one chunk, summarize what it did, and pause. You verify (or course-correct) and tell it to continue.

---

## Summary of human checkpoints

| Stage | Checkpoint | What you're doing |
|---|---|---|
| 1.1 | Schema review | Approve medical record tables before applying |
| 1.2 | Run migration | Apply vital signs schema in Supabase |
| 1.3 | Run migration | Apply summary signing schema |
| 1.4 | Run migration + verify | Apply audit log, test that triggers fire |
| 1.7 | E2E sign test | Validate sign + addendum at SQL level |
| 1 end | Data layer review | Confirm everything works before UI |
| 2.4 | UX walk-through | Click through a patient profile |
| 3.1 | Library choice | @react-pdf/renderer vs pdfkit |
| 3 end | PDF eyeball | Download a sample, iterate |
| 4 end | Polish review | Verify confirms/toasts/skeletons cohere |
| 5.2 | Default route | Today vs Calendar as landing page |
| 6.1 | Mobile nav style | Bottom nav vs hamburger |
| 6 end | Real device test | iOS Safari + Android Chrome |
| 7.1 | Phone matching | Confirm wa_id linking logic works for phone |
| 7.2 | Messaging design | Shared secret + conversation logging |
| 7.3 | Appointment types | Confirm types/durations |
| 8 end | Recurring design | Dedicated planning session before building |
| 9.1 | Enable MFA | Enroll your own account |
| 9.3 | Virus scan choice | VirusTotal vs ClamAV |
| 9.4 | Sentry setup | Account + DSN, or self-hosted GlitchTip |
| 9.5 | Backup test | Block 30 min, restore from backup |
| 10.1 | Privacy split review | Approve patient-facing vs doctor-only data classification |
| 10.3 | Vision/PDF policy | Blind the agent on uploads (safest) vs extract-but-suppress |
| 10.6 | Clinical test cases | Add practice-specific edge cases |
