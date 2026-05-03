# src/jobs — Scheduled Jobs

## What lives here

| File | Purpose |
|---|---|
| `index.ts` | `startScheduler()` — registers all cron jobs via `node-cron` |
| `appointment-reminders.job.ts` | Daily reminder sweep |
| `mark-missed.job.ts` | Daily missed-appointment backfill |

## Schedule

| Job | Cron | Beirut time |
|---|---|---|
| Appointment reminders | `0 5 * * *` UTC | 08:00 Beirut (UTC+3) |
| Mark missed | `0 21 * * *` UTC | Midnight Beirut (UTC+3) |

`mark-missed` also runs once at server startup to catch any appointments that slipped through overnight.

## What each job does

**appointment-reminders.job.ts**: Queries appointments where `appointment_date` is between `now + REMINDER_LEAD_HOURS` and `now + REMINDER_LEAD_HOURS + 1 day`, status = `booked`, `reminder_sent = false`. Sends a WhatsApp reminder via `messaging.service`, marks `reminder_sent = true`.

**mark-missed.job.ts**: Updates all `booked` appointments whose `appointment_date < now` to `missed`. No notification sent.

## Logging

All jobs use `logger` from `src/core/logger`. Never use `console.*`. Errors are caught at the `startScheduler` level and logged — jobs never crash the server process.
