# Modularization Plan — Clinic AI Receptionist

## Goal
Restructure the agent server (repo root) and PMS (`web/`) to follow professional software engineering, ML, and agentic development standards. Architecture target: Hexagonal / Ports & Adapters — dependencies flow inward, infrastructure is swappable, domain logic has no I/O.

**Total scope:** ~71 TypeScript files across both repos.

---

## Progress

- [x] **Phase 1 — Foundation layer** ✅ DONE
- [x] **Phase 2 — Infrastructure layer** ✅ DONE
- [x] **Phase 3 — Repository layer** ✅ DONE
- [x] **Phase 4 — Domain layer** ✅ DONE
- [x] **Phase 5 — Service layer** ✅ DONE
- [x] **Phase 6 — Agent reorganization** ✅ DONE
- [x] **Phase 7 — HTTP layer** ✅ DONE
- [x] **Phase 8 — Jobs layer** ✅ DONE
- [x] **Phase 9 — Web app feature modules** ✅ DONE
- [x] **Phase 10 — CLAUDE.md files** ✅ DONE

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

## Phase 2 — Infrastructure Layer ✅ DONE

**What was done:**
- Created `src/infra/supabase/client.ts` — Supabase singleton (moved from `src/db/client.ts`).
- Created `src/infra/openai/client.ts` — shared OpenAI singleton; `src/agent/loop.ts`, `src/media/audio.ts`, `src/media/image.ts` all replaced their local `new OpenAI(...)` instances with this import.
- Created `src/infra/whatsapp/client.ts` — thin re-export namespace for `sendTextMessage`, `markAsRead`, `downloadMedia`, `getMediaInfo`.
- `src/db/client.ts` → re-export shim → `src/infra/supabase/client`.
- `src/media/storage.ts` updated to import supabase from `src/infra/supabase/client`.

---

## Phase 3 — Repository Layer ✅ DONE

**What was done:**
- Created `src/repositories/` with five `.repo.ts` files: `client.repo.ts`, `appointment.repo.ts`, `clinical.repo.ts`, `test-result.repo.ts`, `visit-summary.repo.ts`.
- Created `src/repositories/index.ts` — barrel re-exporting all five repos.
- All five `src/db/*.ts` files converted to re-export shims pointing at the corresponding repo files.
- Updated callers: `src/agent/tools/`, `src/scheduler/reminders.ts`, `src/scheduler/missed.ts`, `src/agent/memory.ts`, `src/media/router.ts`.
- `src/repositories/test-result.repo.ts` — replaced `console.warn` with `logger.warn`.

---

## Phase 4 — Domain Layer ✅ DONE

**What was done:**
- Created `src/domain/booking/availability.ts` — pure slot-calculator logic (moved from `src/tools/availability.ts`). Imports from `src/core/config` directly.
- Created `src/domain/privacy/policy.ts` — `PRIVACY_POLICY` const documenting patient-facing vs doctor-only fields (moved from `src/agent/privacy.ts`).
- `src/tools/availability.ts` → re-export shim → `src/domain/booking/availability`.
- `src/agent/privacy.ts` → re-export shim → `src/domain/privacy/policy`.
- `src/agent/tools/appointments.ts` updated to import availability from domain layer (now delegates to booking service in Phase 5).

---

## Phase 5 — Service Layer ✅ DONE

**What was done:**
- Created `src/services/booking.service.ts` — all booking business logic extracted from `src/agent/tools/appointments.ts`: `getAvailableSlots`, `bookAppointment`, `listClientAppointments`, `rescheduleClientAppointment`, `cancelClientAppointment`. Owns client-existence checks, slot-conflict checks, appointment-ownership verification.
- Created `src/services/client.service.ts` — thin delegation layer over `client.repo.ts`: `getClient`, `upsertClient`, `updateClient`.
- Created `src/services/messaging.service.ts` — consolidates `src/notifications/send.ts` and the inline `sendAndLog` pattern from `src/server.ts`. All WhatsApp sends + conversation log writes go through here.
- Created `src/services/media-ingestion.service.ts` — thin re-export of `src/media/router.ts` for service-layer consumers.
- `src/agent/tools/appointments.ts` → thin wrapper: tool definitions + calls to `booking.service`.
- `src/agent/tools/clients.ts` → thin wrapper: tool definitions + calls to `client.service`.
- `src/notifications/send.ts` → re-export shim → `src/services/messaging.service`.
- `src/scheduler/reminders.ts` updated to import `sendReminderNotification` from `src/services/messaging.service` (replaced `notifications/send` import).

---

## Phase 6 — Agent Reorganization ✅ DONE

**What was done:**
- Split `src/agent/prompt.ts` into a modular prompt directory:
  - `src/agent/prompt/sections/identity.ts` — `IDENTITY_OPENING` + `CORE_RULES_SECTION`
  - `src/agent/prompt/sections/tools-ref.ts` — `TOOLS_REF_SECTION`
  - `src/agent/prompt/sections/flows.ts` — `FLOWS_SECTION` (conversation flows A–J)
  - `src/agent/prompt/sections/business-rules.ts` — `BUSINESS_RULES_SECTION`
  - `src/agent/prompt/index.ts` — `buildSystemPrompt()` assembles sections + injects live Beirut datetime
- `src/agent/prompt.ts` → re-export shim → `src/agent/prompt/index`.
- Created `src/agent/guardrails/`:
  - `out-of-scope.ts` — `checkOutOfScope()`: regex-based emergency detection, short-circuits before LLM call
  - `privacy.ts` — re-exports `PRIVACY_POLICY` from `src/domain/privacy/policy`
  - `index.ts` — `runGuardrails(input): GuardrailResult` (`pass` | `block`)
- `src/agent/loop.ts` updated: calls `runGuardrails()` before every LLM invocation; returns canned response immediately on `block`.

---

## Phase 7 — HTTP Layer ✅ DONE

**What was done:**
- Created `src/http/middleware/auth.ts` — `requireInternalToken` middleware (extracted from inline route checks in `src/server.ts`).
- Created `src/http/middleware/error-handler.ts` — Express error boundary using `AppError.statusCode` from `src/core/errors`.
- Created `src/http/routes/health.ts` — `GET /health`
- Created `src/http/routes/internal.ts` — `POST /internal/notify` + `POST /internal/send-message`, protected by `requireInternalToken`, uses `messaging.service`.
- Created `src/http/routes/webhook.ts` — `GET /webhook` (verification) + `POST /webhook` (message handler).
- Created `src/http/index.ts` — assembles Express app, mounts all routers + error handler.
- `src/server.ts` reduced to ~10 lines: imports `app` from `src/http/index`, starts listen, starts scheduler.

---

## Phase 8 — Jobs Layer ✅ DONE

**What was done:**
- Created `src/jobs/appointment-reminders.job.ts` — daily reminder job (migrated from `src/scheduler/reminders.ts`; uses `logger` throughout, imports from repositories + messaging service).
- Created `src/jobs/mark-missed.job.ts` — midnight missed-appointment sweep (migrated from `src/scheduler/missed.ts`; uses `logger`, imports supabase from `src/infra/supabase/client`).
- Created `src/jobs/index.ts` — `startScheduler()` wired to both jobs; all `console.*` replaced with `logger.*`.
- `src/scheduler/index.ts` → re-export shim → `src/jobs/index`.
- `src/server.ts` updated to import `startScheduler` from `src/jobs/index`.
- `tsc --noEmit` confirmed clean after all phases.

---

## Phase 9 — Web App Feature Modules ✅ DONE

**What was done:**
- Created `web/src/features/` with five subdirectories: `calendar/`, `patients/`, `visit-summaries/`, `test-results/`, `medical-record/`.
- Moved all 13 UI components from `web/src/components/calendar/` and `web/src/components/patients/` into their canonical feature directories.
- Created canonical action files co-located with components (`features/*/actions.ts` and `features/medical-record/vital-signs.actions.ts`). Key fix: `waId: string | null` (not `string`) on reschedule/cancel actions to match component call sites.
- Converted 6 old action files (`app/actions/` + `(dashboard)/*/actions.ts`) to 2-line `'use server'; export * from '@/features/...'` shims.
- Converted 13 old component files (`components/calendar/` + `components/patients/`) to `export { default } from '@/features/...'` shims (with named type re-exports where needed).
- Updated 3 `app/` page files to import directly from `@/features/...` (thin pages, no business logic).
- `next build` confirmed clean: all 11 routes generated, zero TypeScript errors.

---

## Phase 10 — CLAUDE.md Files ✅ DONE

**What was done:**
- Created CLAUDE.md files for every major source directory in both repos.

| File | Status |
|---|---|
| `/CLAUDE.md` | ✅ Done in Phase 1 |
| `src/core/CLAUDE.md` | ✅ Created — config shape, logger rules, error hierarchy |
| `src/infra/CLAUDE.md` | ✅ Created — singleton pattern, no-business-logic rule |
| `src/repositories/CLAUDE.md` | ✅ Created — one-file-per-table, privacy constraint, naming |
| `src/domain/CLAUDE.md` | ✅ Created — pure functions only, slot logic |
| `src/services/CLAUDE.md` | ✅ Created — service pattern, ownership, composition |
| `src/agent/CLAUDE.md` | ✅ Created — loop mechanics, memory, prompt sections |
| `src/agent/tools/CLAUDE.md` | ✅ Created — tool format, thin-wrapper rule, privacy boundary |
| `src/agent/guardrails/CLAUDE.md` | ✅ Created — current checks, how to add a new guardrail |
| `src/http/CLAUDE.md` | ✅ Created — route structure, auth middleware, error handler |
| `src/jobs/CLAUDE.md` | ✅ Created — cron schedule (UTC vs Beirut), job descriptions |
| `web/CLAUDE.md` | ✅ Already existed — PMS overview, auth flow, component patterns |
| `web/src/features/CLAUDE.md` | ✅ Created — feature module pattern, co-location rule, cross-feature imports |

---

## Key Architectural Constraints (apply throughout)

1. **Dependency direction:** `http/jobs → services → repositories → infra/domain → core`. Never skip layers upward.
2. **No Google APIs anywhere.** They were fully removed. Do not introduce them.
3. **Privacy boundary is sacred.** `visit_summaries`, `visit_vital_signs`, doctor notes — never in agent tools or clinical repo queries.
4. **`tsc --noEmit` must stay clean after every phase.**
5. **No feature regressions.** WhatsApp end-to-end flow must work after each phase.
6. **Backwards-compat shims are temporary.** Each shim (re-export from old path) should be deleted in Phase 10 cleanup.
