# Modularization Plan — Clinic AI Receptionist

## Goal
Restructure the agent server (repo root) and PMS (`web/`) to follow professional software engineering, ML, and agentic development standards. Architecture target: Hexagonal / Ports & Adapters — dependencies flow inward, infrastructure is swappable, domain logic has no I/O.

**Total scope:** ~71 TypeScript files across both repos.

---

## Progress

- [x] **Phase 1 — Foundation layer** ✅ DONE
- [ ] **Phase 2 — Infrastructure layer**
- [ ] **Phase 3 — Repository layer**
- [ ] **Phase 4 — Domain layer**
- [ ] **Phase 5 — Service layer**
- [ ] **Phase 6 — Agent reorganization**
- [ ] **Phase 7 — HTTP layer**
- [ ] **Phase 8 — Jobs layer**
- [ ] **Phase 9 — Web app feature modules**
- [ ] **Phase 10 — CLAUDE.md files**

---

## Phase 1 — Foundation Layer ✅ DONE

**What was done:**
- Created `src/core/config.ts` — Zod schema replacing the manual `required()`/`optional()` helpers. Fails fast at startup with a clear list of every missing env var.
- Created `src/core/logger.ts` — Pino structured logger (pretty-printed in dev, JSON in prod).
- Created `src/core/errors.ts` — `AppError`, `NotFoundError`, `ValidationError`, `UnauthorizedError`.
- Updated `src/config/index.ts` — thin re-export shim so all existing `from '../config'` imports keep working.
- Updated `src/app.ts` + `src/server.ts` — replaced all `console.log`/`console.error` with structured `logger.*` calls.
- Rewrote root `CLAUDE.md` — accurate current state, no Google references, correct tool list, all 12 migrations.
- Installed: `zod`, `pino`, `pino-pretty`.

---

## Phase 2 — Infrastructure Layer

**Goal:** Extract all third-party I/O clients into `src/infra/`. Each subfolder owns one external dependency.

**Target structure:**
```
src/infra/
├── supabase/
│   └── client.ts      (move from src/db/client.ts — re-export from db/client.ts for compat)
├── openai/
│   └── client.ts      (singleton OpenAI client, reads from core/config)
└── whatsapp/
    └── client.ts      (re-export or thin wrapper around whatsapp/sender.ts + media.ts)
```

**Steps:**
1. Create `src/infra/supabase/client.ts` — move the singleton `createClient()` from `src/db/client.ts`. Keep `src/db/client.ts` as a re-export shim.
2. Create `src/infra/openai/client.ts` — extract the `new OpenAI({ apiKey })` instantiation from wherever it currently lives (agent loop, audio, image). Single shared instance.
3. Create `src/infra/whatsapp/client.ts` — thin namespace re-exporting `sendTextMessage`, `markAsRead`, `downloadMedia`.
4. `tsc --noEmit` must stay clean.

**Key constraint:** No business logic enters `infra/`. These are pure adapters.

---

## Phase 3 — Repository Layer

**Goal:** Rename `src/db/` → `src/repositories/` and adopt `.repo.ts` naming convention. Each file owns one table/domain.

**Rename map:**
```
src/db/clients.ts          → src/repositories/client.repo.ts
src/db/appointments.ts     → src/repositories/appointment.repo.ts
src/db/clinical.ts         → src/repositories/clinical.repo.ts
src/db/test_results.ts     → src/repositories/test-result.repo.ts
src/db/visit_summaries.ts  → src/repositories/visit-summary.repo.ts
src/db/client.ts           → stays as src/db/client.ts (infra shim, not a repo)
```

**Steps:**
1. Create each `.repo.ts` file by moving the contents.
2. Add a barrel `src/repositories/index.ts` that re-exports everything.
3. Update all imports across `src/agent/tools/`, `src/scheduler/`, `src/app.ts`, `src/server.ts`.
4. Keep `src/db/` with re-export shims for any imports not yet migrated.
5. `tsc --noEmit` clean.

---

## Phase 4 — Domain Layer

**Goal:** Pure business logic with no I/O. Two things move here.

**Target structure:**
```
src/domain/
├── booking/
│   └── availability.ts    (move from src/tools/availability.ts)
└── privacy/
    └── policy.ts          (move from src/agent/privacy.ts)
```

**Steps:**
1. Move `src/tools/availability.ts` → `src/domain/booking/availability.ts`. Delete `src/tools/` folder.
2. Move `src/agent/privacy.ts` → `src/domain/privacy/policy.ts`. Update the import in `src/agent/tools/index.ts`.
3. Update all callers of `availability.ts` (currently `src/agent/tools/appointments.ts` and `src/scheduler/reminders.ts`).
4. `tsc --noEmit` clean.

**Key constraint:** No Supabase, no OpenAI, no HTTP in `domain/`. Pure TypeScript functions only.

---

## Phase 5 — Service Layer

**Goal:** Orchestration layer. Services compose repositories + infra to implement use-cases. No Express in here.

**Target structure:**
```
src/services/
├── booking.service.ts       (slot availability, create/reschedule/cancel appointment)
├── client.service.ts        (upsert/update/link patient)
├── messaging.service.ts     (send WhatsApp message + log to conversation_messages)
└── media-ingestion.service.ts  (route inbound media → extract text → save to storage)
```

**Steps:**
1. Extract booking logic from `src/agent/tools/appointments.ts` into `booking.service.ts`. Tool wrappers become thin callers.
2. Extract client upsert/update from `src/agent/tools/clients.ts` + `src/db/clients.ts` into `client.service.ts`.
3. Extract WhatsApp send + conversation log from `src/server.ts` (`/internal/send-message`) and `src/app.ts` into `messaging.service.ts`. Wire `src/notifications/send.ts` in here (consolidates the parallel notifications folder).
4. Extract media routing from `src/app.ts` + `src/media/router.ts` into `media-ingestion.service.ts`.
5. `tsc --noEmit` clean.

---

## Phase 6 — Agent Reorganization

**Goal:** The agent folder becomes lean. Split the monolithic system prompt. Add a `guardrails/` layer.

**Target structure:**
```
src/agent/
├── loop.ts              (unchanged — orchestrates LLM calls)
├── memory.ts            (unchanged)
├── prompt/
│   ├── index.ts         (buildSystemPrompt() — assembles sections)
│   ├── sections/
│   │   ├── identity.ts       (who the agent is + core rules)
│   │   ├── tools-ref.ts      (tools reference table)
│   │   ├── flows.ts          (booking/reschedule/cancel/query flows A–J)
│   │   └── business-rules.ts (hours, timezone, duration)
├── guardrails/
│   ├── index.ts         (runGuardrails(input) → pass | block | redirect)
│   ├── out-of-scope.ts  (medical advice, billing, other patients)
│   └── privacy.ts       (moved from src/domain/privacy — agent-specific enforcement)
└── tools/               (unchanged structure, thinner implementations via services)
```

**Steps:**
1. Split `src/agent/prompt.ts` into prompt sections. `buildSystemPrompt()` assembles them.
2. Create `src/agent/guardrails/out-of-scope.ts` — regex/keyword checks that short-circuit before LLM call for obvious out-of-scope inputs (emergencies, billing, etc.).
3. Wire guardrails into `src/agent/loop.ts` as a pre-LLM check.
4. Tool implementations delegate to services (Phase 5) rather than calling repositories directly.
5. `tsc --noEmit` clean.

---

## Phase 7 — HTTP Layer

**Goal:** Express route handlers are thin — no business logic. Extract middleware.

**Target structure:**
```
src/http/
├── routes/
│   ├── webhook.ts       (GET /webhook, POST /webhook)
│   ├── internal.ts      (POST /internal/notify, POST /internal/send-message)
│   └── health.ts        (GET /health)
├── middleware/
│   ├── auth.ts          (internal token check — extracted from route handlers)
│   └── error-handler.ts (Express error boundary using AppError from core/errors)
└── index.ts             (assembles app, mounts routes)
```

**Steps:**
1. Move route handlers from `src/server.ts` into `src/http/routes/`.
2. Extract `x-internal-token` check into `src/http/middleware/auth.ts`.
3. Add Express error handler middleware using `AppError.statusCode`.
4. `src/server.ts` becomes 10 lines: import `app` from `src/http/index.ts`, call `app.listen`.
5. `tsc --noEmit` clean.

---

## Phase 8 — Jobs Layer

**Goal:** Rename `src/scheduler/` → `src/jobs/` for clarity. Each job is self-contained.

**Target structure:**
```
src/jobs/
├── index.ts             (start all jobs — replaces src/scheduler/index.ts)
├── appointment-reminders.job.ts   (every 5 min — replaces reminders.ts)
└── mark-missed.job.ts             (daily midnight Beirut — replaces missed.ts)
```

**Steps:**
1. Rename/move files with `.job.ts` suffix.
2. Update `src/server.ts` import from `src/scheduler` → `src/jobs`.
3. `tsc --noEmit` clean.

---

## Phase 9 — Web App Feature Modules

**Goal:** Co-locate server actions with their UI components. Thin `app/` pages.

**Current structure problem:** All server actions live in `app/actions/` or `(dashboard)/*/actions.ts`, disconnected from the components that use them.

**Target structure:**
```
web/src/
├── features/
│   ├── calendar/
│   │   ├── actions.ts          (moved from app/(dashboard)/calendar/actions.ts)
│   │   ├── CalendarView.tsx
│   │   ├── CreateEventModal.tsx
│   │   └── EventModal.tsx
│   ├── patients/
│   │   ├── actions.ts          (merged from app/(dashboard)/patients/actions.ts)
│   │   ├── PatientSearch.tsx
│   │   ├── ProfileEditor.tsx
│   │   ├── NewPatientButton.tsx
│   │   └── MessagePatientButton.tsx
│   ├── visit-summaries/
│   │   ├── actions.ts          (moved from app/actions/visit-summaries.ts)
│   │   └── VisitSummaryPanel.tsx
│   ├── test-results/
│   │   ├── actions.ts          (moved from app/actions/test-results.ts)
│   │   └── TestResultsPanel.tsx
│   └── medical-record/
│       ├── MedicalRecordPanel.tsx
│       ├── VitalSignsPanel.tsx
│       ├── AppointmentsWithSummary.tsx
│       └── TimelinePanel.tsx
├── app/
│   └── (dashboard)/
│       ├── calendar/page.tsx   (imports from features/calendar — thin)
│       ├── patients/
│       │   ├── page.tsx        (imports from features/patients — thin)
│       │   └── [id]/page.tsx   (imports from features/* — thin)
│       └── settings/page.tsx
└── core/
    └── (shared: RealtimeRefresher, ConfirmDialog, Toast, layout components)
```

**Steps:**
1. Create `web/src/features/` with subdirectories.
2. Move components + co-locate their actions.
3. Update `app/` page imports.
4. Verify `next build` clean.

---

## Phase 10 — CLAUDE.md Files

**Goal:** Every major directory gets a CLAUDE.md so any new Claude session understands the module's purpose, constraints, and patterns without reading all the code.

**Files to create/update:**

| File | Content |
|---|---|
| `/CLAUDE.md` | ✅ Done in Phase 1 — root overview, full architecture, all tools, env vars, migrations |
| `src/core/CLAUDE.md` | Zod config shape, logger usage (never use console.*), error class hierarchy |
| `src/infra/CLAUDE.md` | Singleton pattern, how to add a new infra client, never put business logic here |
| `src/repositories/CLAUDE.md` | One file per table, naming convention, privacy-filtered queries for clinical |
| `src/domain/CLAUDE.md` | Pure functions only, no I/O, how availability.ts works (slot logic) |
| `src/services/CLAUDE.md` | Service pattern, what each service owns, how they compose repos + infra |
| `src/agent/CLAUDE.md` | Agentic loop mechanics, sliding window memory, tool dispatch, guardrails |
| `src/agent/tools/CLAUDE.md` | Tool definition format, how executeTool routes, privacy boundary |
| `src/agent/guardrails/CLAUDE.md` | What guardrails check, how to add a new rule |
| `src/http/CLAUDE.md` | Route structure, auth middleware, error handler |
| `src/jobs/CLAUDE.md` | Cron schedule, what each job does, timezone handling |
| `web/CLAUDE.md` | ✅ Already exists — PMS overview, auth flow, component patterns |
| `web/src/features/CLAUDE.md` | Feature module pattern, action co-location rule |

---

## Key Architectural Constraints (apply throughout)

1. **Dependency direction:** `http/jobs → services → repositories → infra/domain → core`. Never skip layers upward.
2. **No Google APIs anywhere.** They were fully removed. Do not introduce them.
3. **Privacy boundary is sacred.** `visit_summaries`, `visit_vital_signs`, doctor notes — never in agent tools or clinical repo queries.
4. **`tsc --noEmit` must stay clean after every phase.**
5. **No feature regressions.** WhatsApp end-to-end flow must work after each phase.
6. **Backwards-compat shims are temporary.** Each shim (re-export from old path) should be deleted in Phase 10 cleanup.
