-- ============================================================
-- 0003_appointments_simplify.sql
-- Simplify booking_status: pending/confirmed → booked
-- Drop calendar_event_id (Google Calendar removed)
-- ============================================================

-- 1. Migrate existing status values
update appointments
set booking_status = 'booked'
where booking_status in ('confirmed', 'pending');

-- 2. Drop old check constraint and add simplified one
alter table appointments
  drop constraint if exists appointments_booking_status_check;

alter table appointments
  add constraint appointments_booking_status_check
  check (booking_status in ('booked', 'cancelled', 'completed'));

-- 3. Update column default
alter table appointments
  alter column booking_status set default 'booked';

-- 4. Drop Google Calendar event ID
alter table appointments
  drop column if exists calendar_event_id;
