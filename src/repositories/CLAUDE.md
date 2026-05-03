# src/repositories — Repository Layer

## What lives here

One file per database table. Each file owns all SQL for its table.

| File | Table |
|---|---|
| `client.repo.ts` | `clients` |
| `appointment.repo.ts` | `appointments` |
| `clinical.repo.ts` | `client_allergies`, `client_problems`, `client_medications`, `client_family_history`, `client_social_history` |
| `test-result.repo.ts` | `test_results` |
| `visit-summary.repo.ts` | `visit_summaries` |
| `index.ts` | Barrel re-export of all repos |

## Privacy constraint (critical)

`clinical.repo.ts` uses narrow `SELECT` column lists that **exclude** `doctor_note`, diagnosis fields, and vital readings. This ensures the agent can only read patient-safe fields. Do not add doctor-only columns to these queries.

## Naming convention

- File: `<table-name>.repo.ts`
- Exports: named functions (`getClientByWaId`, `createAppointment`, etc.)
- Types: exported interfaces alongside the functions they relate to

## Backwards-compat shims

`src/db/*.ts` files re-export from the corresponding repo. These shims exist for backwards compatibility and will be removed in Phase 10 cleanup. New code should import from `src/repositories/` directly.
