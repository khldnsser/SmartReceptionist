-- ============================================================
-- 0008_medical_record.sql  –  Structured clinical record tables
-- Replaces/supplements clients.medical_history (free text stays
-- for legacy data, but these tables are the canonical record).
-- ============================================================

-- ── Enums ────────────────────────────────────────────────────

create type allergy_severity as enum ('mild', 'moderate', 'severe');
create type problem_status   as enum ('active', 'resolved', 'inactive');

-- ── client_allergies ─────────────────────────────────────────

create table if not exists client_allergies (
  id          uuid        primary key default gen_random_uuid(),
  client_id   uuid        not null references clients (id) on delete cascade,
  substance   text        not null,
  reaction    text        not null,
  severity    allergy_severity not null default 'mild',
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists client_allergies_client_id_idx
  on client_allergies (client_id);

create trigger client_allergies_updated_at
  before update on client_allergies
  for each row execute procedure set_updated_at();

-- ── client_problems ──────────────────────────────────────────

create table if not exists client_problems (
  id          uuid           primary key default gen_random_uuid(),
  client_id   uuid           not null references clients (id) on delete cascade,
  problem     text           not null,
  icd10_code  text,
  onset_date  date,
  status      problem_status not null default 'active',
  notes       text,
  created_at  timestamptz    not null default now(),
  updated_at  timestamptz    not null default now()
);

create index if not exists client_problems_client_id_idx
  on client_problems (client_id);
create index if not exists client_problems_status_idx
  on client_problems (client_id, status);

create trigger client_problems_updated_at
  before update on client_problems
  for each row execute procedure set_updated_at();

-- ── client_medications ───────────────────────────────────────

create table if not exists client_medications (
  id          uuid        primary key default gen_random_uuid(),
  client_id   uuid        not null references clients (id) on delete cascade,
  drug_name   text        not null,
  dose        text        not null,
  frequency   text        not null,
  start_date  date        not null,
  end_date    date,
  indication  text,
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint  end_after_start check (end_date is null or end_date >= start_date)
);

create index if not exists client_medications_client_id_idx
  on client_medications (client_id);
create index if not exists client_medications_active_idx
  on client_medications (client_id) where end_date is null;

create trigger client_medications_updated_at
  before update on client_medications
  for each row execute procedure set_updated_at();

-- ── client_family_history ────────────────────────────────────

create table if not exists client_family_history (
  id          uuid        primary key default gen_random_uuid(),
  client_id   uuid        not null references clients (id) on delete cascade,
  relation    text        not null,
  condition   text        not null,
  notes       text,
  created_at  timestamptz not null default now()
);

create index if not exists client_family_history_client_id_idx
  on client_family_history (client_id);

-- ── client_social_history ────────────────────────────────────
-- One row per client (upsert on client_id).

create table if not exists client_social_history (
  id                 uuid        primary key default gen_random_uuid(),
  client_id          uuid        not null unique references clients (id) on delete cascade,
  smoking_status     text        check (smoking_status in ('never', 'former', 'current')),
  smoking_details    text,
  alcohol_use        text        check (alcohol_use in ('none', 'mild', 'moderate', 'heavy')),
  alcohol_details    text,
  drug_use           text        check (drug_use in ('none', 'mild', 'moderate', 'heavy')),
  drug_use_details   text,
  occupation         text,
  living_situation   text,
  other_notes        text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create trigger client_social_history_updated_at
  before update on client_social_history
  for each row execute procedure set_updated_at();

-- ── RLS ──────────────────────────────────────────────────────

alter table client_allergies       enable row level security;
alter table client_problems        enable row level security;
alter table client_medications     enable row level security;
alter table client_family_history  enable row level security;
alter table client_social_history  enable row level security;

create policy "doctors_all_on_client_allergies" on client_allergies
  for all to authenticated using (is_doctor()) with check (is_doctor());

create policy "doctors_all_on_client_problems" on client_problems
  for all to authenticated using (is_doctor()) with check (is_doctor());

create policy "doctors_all_on_client_medications" on client_medications
  for all to authenticated using (is_doctor()) with check (is_doctor());

create policy "doctors_all_on_client_family_history" on client_family_history
  for all to authenticated using (is_doctor()) with check (is_doctor());

create policy "doctors_all_on_client_social_history" on client_social_history
  for all to authenticated using (is_doctor()) with check (is_doctor());
