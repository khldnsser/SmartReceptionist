-- ============================================================
-- 0002_pms_schema.sql  –  PMS tables: visit_summaries, test_results, doctors
-- ============================================================

-- ── visit_summaries ──────────────────────────────────────────
create table if not exists visit_summaries (
  id              uuid primary key default gen_random_uuid(),
  client_id       uuid not null references clients (id) on delete cascade,
  appointment_id  uuid references appointments (id) on delete set null,
  diagnosis       text,
  notes           text,
  treatment       text,
  follow_up       text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists visit_summaries_client_id_idx
  on visit_summaries (client_id, created_at desc);

create trigger visit_summaries_updated_at
  before update on visit_summaries
  for each row execute procedure set_updated_at();

-- ── test_results ─────────────────────────────────────────────
create table if not exists test_results (
  id               uuid primary key default gen_random_uuid(),
  client_id        uuid not null references clients (id) on delete cascade,
  storage_path     text not null,
  mime_type        text,
  file_name        text,
  file_size_bytes  int,
  patient_note     text,
  doctor_label     text,
  doctor_note      text,
  uploaded_via     text not null default 'whatsapp'
                     check (uploaded_via in ('whatsapp', 'web')),
  created_at       timestamptz not null default now()
);

create index if not exists test_results_client_id_idx
  on test_results (client_id, created_at desc);

-- ── doctors (extends auth.users 1:1) ─────────────────────────
-- Create the doctor row by inserting into this table after creating
-- the user in Supabase Auth (auth.users).
create table if not exists doctors (
  id         uuid primary key references auth.users (id) on delete cascade,
  email      text unique not null,
  name       text,
  created_at timestamptz not null default now()
);
