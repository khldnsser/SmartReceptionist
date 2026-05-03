-- 0012_appointment_types.sql
-- Add appointment_type enum and duration_minutes to appointments table.
-- Run in Supabase SQL editor.

DO $$ BEGIN
  CREATE TYPE appointment_type AS ENUM ('initial', 'follow_up', 'procedure', 'telemedicine');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS appointment_type appointment_type NOT NULL DEFAULT 'follow_up',
  ADD COLUMN IF NOT EXISTS duration_minutes int NOT NULL DEFAULT 30
    CONSTRAINT duration_minutes_range CHECK (duration_minutes > 0 AND duration_minutes <= 480);
