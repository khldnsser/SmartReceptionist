# src/domain — Domain Layer

## What lives here

Pure business logic with no I/O. Functions here take plain inputs and return plain outputs — no database, no HTTP, no side effects.

| File | What it contains |
|---|---|
| `booking/availability.ts` | `getNextAvailableSlots()` — slot calculator using office hours config |
| `privacy/policy.ts` | `PRIVACY_POLICY` — documents what the agent may/may not relay |

## Rules

1. **No I/O.** No `supabase`, no `fetch`, no `fs`. If you need I/O, it belongs in `repositories/` or `services/`.
2. **Pure functions.** Same inputs always produce same outputs. Side-effect free.
3. **Config is allowed.** `src/core/config` is a pure read of startup-validated values — importing it is fine.

## How availability.ts works

`getNextAvailableSlots(n, existingBookings, referenceNow?)` computes the next `n` 30-minute slots that:
- Fall within Mon–Fri office hours (09:00–12:00, 13:00–17:00 Beirut)
- Are at least `MIN_BOOKING_LEAD_HOURS` from now
- Do not conflict with `existingBookings`

Called by `src/services/booking.service.ts` which supplies the DB-fetched bookings.
