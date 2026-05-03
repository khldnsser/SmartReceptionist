# web/src/features — Feature Modules

## Pattern

Each feature is a self-contained directory with co-located server actions and UI components.

```
features/
├── calendar/           CalendarView, EventModal, CreateEventModal + actions
├── patients/           PatientSearch, ProfileEditor, NewPatientButton, MessagePatientButton + actions
├── visit-summaries/    VisitSummaryPanel + actions
├── test-results/       TestResultsPanel + actions
└── medical-record/     MedicalRecordPanel, VitalSignsPanel, AppointmentsWithSummary, TimelinePanel + actions
```

## Rules

1. **Actions live next to the components that use them.** `features/calendar/actions.ts` is the canonical location for calendar server actions.
2. **Old paths are shims.** `app/(dashboard)/calendar/actions.ts` and `components/calendar/*.tsx` re-export from features/. Do not add new logic there.
3. **Cross-feature imports are allowed at the features level.** `medical-record/AppointmentsWithSummary.tsx` imports `saveVisitSummary` from `@/features/visit-summaries/actions` — that is correct. Use `@/features/...` absolute paths for cross-feature imports.
4. **Shared UI (ConfirmDialog, Toast, RealtimeRefresher, layout) stays in `src/components/`.** Features import shared components via `@/components/...`.
5. **`app/` pages are thin.** They fetch data server-side and pass it to feature components. No business logic in pages.

## Action files

All action files start with `'use server'`. They import from:
- `@/lib/supabase/server` (admin client for data, auth client for session checks)
- `@/lib/notify` (WhatsApp notifications via agent server)
- `@/lib/audit` (audit log writes)
- `next/cache` (revalidatePath)

## vital-signs.actions.ts

Vital signs actions are in `medical-record/vital-signs.actions.ts` (separate from `medical-record/actions.ts`) because they operate on a different table (`visit_vital_signs`) and are used exclusively by `VitalSignsPanel`.
