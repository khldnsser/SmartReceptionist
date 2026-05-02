-- ============================================================
-- 0007_realtime.sql  –  Enable Supabase Realtime on key tables
-- ============================================================

-- Add tables to the default supabase_realtime publication so
-- the PMS can subscribe to INSERT/UPDATE/DELETE events.
alter publication supabase_realtime add table appointments;
alter publication supabase_realtime add table clients;
