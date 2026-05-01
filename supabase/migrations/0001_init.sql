-- ============================================================
-- 0001_init.sql  –  FYP Clinic AI Receptionist
-- ============================================================

-- ── clients ──────────────────────────────────────────────────
create table if not exists clients (
  id               uuid primary key default gen_random_uuid(),
  wa_id            text unique not null,
  email            text unique,
  name             text,
  phone            text,
  age              int,
  medical_history  text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists clients_wa_id_idx  on clients (wa_id);
create index if not exists clients_email_idx  on clients (email);

-- keep updated_at current automatically
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger clients_updated_at
  before update on clients
  for each row execute procedure set_updated_at();

-- ── appointments ─────────────────────────────────────────────
create table if not exists appointments (
  id                uuid primary key default gen_random_uuid(),
  client_id         uuid not null references clients (id) on delete cascade,
  appointment_date  timestamptz not null,
  booking_status    text not null default 'pending'
                      check (booking_status in ('pending', 'confirmed', 'cancelled', 'completed')),
  calendar_event_id text,
  intake_form       text,
  reminder_sent     boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists appointments_client_id_idx on appointments (client_id, appointment_date desc);

create trigger appointments_updated_at
  before update on appointments
  for each row execute procedure set_updated_at();

-- ── conversation_messages (sliding-window memory) ────────────
create table if not exists conversation_messages (
  id           bigserial primary key,
  wa_id        text not null,
  role         text not null check (role in ('user', 'assistant', 'tool', 'system')),
  content      text,
  tool_calls   jsonb,
  tool_call_id text,
  created_at   timestamptz not null default now()
);

create index if not exists conv_messages_wa_id_idx on conversation_messages (wa_id, created_at desc);
