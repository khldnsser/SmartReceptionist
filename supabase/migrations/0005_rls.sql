-- ============================================================
-- 0005_rls.sql  –  Row-Level Security for PMS doctor access
-- The agent uses the service_role key and bypasses RLS entirely.
-- These policies guard client-side (anon key + doctor JWT) access.
-- ============================================================

-- Enable RLS on all patient data tables
alter table clients              enable row level security;
alter table appointments         enable row level security;
alter table visit_summaries      enable row level security;
alter table test_results         enable row level security;
alter table conversation_messages enable row level security;
alter table doctors              enable row level security;

-- Helper: is the requesting user a registered doctor?
-- Used in all policies to avoid repeating the sub-select.
create or replace function is_doctor()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from doctors where id = auth.uid()
  )
$$;

-- ── clients ──────────────────────────────────────────────────
create policy "doctors_all_on_clients" on clients
  for all to authenticated
  using (is_doctor())
  with check (is_doctor());

-- ── appointments ─────────────────────────────────────────────
create policy "doctors_all_on_appointments" on appointments
  for all to authenticated
  using (is_doctor())
  with check (is_doctor());

-- ── visit_summaries ──────────────────────────────────────────
create policy "doctors_all_on_visit_summaries" on visit_summaries
  for all to authenticated
  using (is_doctor())
  with check (is_doctor());

-- ── test_results ─────────────────────────────────────────────
create policy "doctors_all_on_test_results" on test_results
  for all to authenticated
  using (is_doctor())
  with check (is_doctor());

-- ── conversation_messages ────────────────────────────────────
create policy "doctors_all_on_messages" on conversation_messages
  for all to authenticated
  using (is_doctor())
  with check (is_doctor());

-- ── doctors (self-read) ──────────────────────────────────────
create policy "doctors_read_own_row" on doctors
  for select to authenticated
  using (id = auth.uid());

-- ── Storage: authenticated doctors can read patient uploads ──
create policy "doctors_read_patient_uploads" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'patient-uploads'
    and is_doctor()
  );
