# src/services — Service Layer

## What lives here

Business logic that requires I/O. Services compose repositories + infrastructure clients to implement use cases.

| File | What it owns |
|---|---|
| `booking.service.ts` | Appointment lifecycle: slot availability, book, list, reschedule, cancel. Enforces client-existence checks, slot-conflict checks, ownership verification. |
| `client.service.ts` | Patient profile CRUD: get, upsert (phone-based WA linking), update. |
| `messaging.service.ts` | All outbound WhatsApp sends + conversation log writes. Single `sendAndLog()` entrypoint. |
| `media-ingestion.service.ts` | Re-exports `routeMessageToText` from `src/media/router.ts`. |

## Dependency rule

Services may import from: `repositories/`, `infra/`, `domain/`, `core/`.  
Services must NOT import from: `http/`, `jobs/`, `agent/`.

## Patterns

**booking.service.ts**: `getAvailableSlots()` delegates slot math to `domain/booking/availability.ts`, then fetches booked appointments from the repo to pass as conflicts.

**messaging.service.ts**: `sendAndLog(waId, text)` — calls `sendTextMessage` (infra/whatsapp) then writes to `conversation_messages` (supabase). All other send helpers (`sendBookingConfirmation`, `sendReminderNotification`, etc.) call `sendAndLog` internally.
