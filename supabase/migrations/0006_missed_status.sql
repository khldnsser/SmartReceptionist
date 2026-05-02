-- Add 'missed' as a valid booking status
ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_booking_status_check;
ALTER TABLE appointments ADD CONSTRAINT appointments_booking_status_check
  CHECK (booking_status IN ('booked', 'cancelled', 'completed', 'missed'));

-- Immediately mark any past-booked appointments as missed
UPDATE appointments
SET booking_status = 'missed'
WHERE booking_status = 'booked'
  AND appointment_date < (now() AT TIME ZONE 'Asia/Beirut')::date;
