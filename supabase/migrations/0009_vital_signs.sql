-- ============================================================
-- 0009_vital_signs.sql  –  Vital signs captured per appointment
-- ============================================================

create table if not exists visit_vital_signs (
  id             uuid        primary key default gen_random_uuid(),
  appointment_id uuid        not null references appointments (id) on delete cascade,
  client_id      uuid        not null references clients (id) on delete cascade,
  systolic_bp    smallint    check (systolic_bp  between 50  and 300),
  diastolic_bp   smallint    check (diastolic_bp between 20  and 200),
  heart_rate     smallint    check (heart_rate   between 20  and 300),
  temperature_c  numeric(4,1) check (temperature_c between 30 and 45),
  weight_kg      numeric(5,1) check (weight_kg   between 1   and 500),
  height_cm      numeric(5,1) check (height_cm   between 30  and 250),
  -- BMI stored (not generated) so it's queryable without recalculation
  -- and survives height/weight edits intentionally left as-is.
  bmi            numeric(4,1),
  o2_saturation  numeric(4,1) check (o2_saturation between 50 and 100),
  notes          text,
  captured_at    timestamptz not null default now(),
  created_at     timestamptz not null default now()
);

-- Compute BMI on insert/update when both values are present
create or replace function compute_bmi()
returns trigger language plpgsql as $$
begin
  if new.weight_kg is not null and new.height_cm is not null and new.height_cm > 0 then
    new.bmi := round((new.weight_kg / ((new.height_cm / 100.0) ^ 2))::numeric, 1);
  else
    new.bmi := null;
  end if;
  return new;
end;
$$;

create trigger visit_vital_signs_bmi
  before insert or update on visit_vital_signs
  for each row execute procedure compute_bmi();

create index if not exists visit_vital_signs_appointment_id_idx
  on visit_vital_signs (appointment_id);
create index if not exists visit_vital_signs_client_id_idx
  on visit_vital_signs (client_id, captured_at desc);

-- ── RLS ──────────────────────────────────────────────────────

alter table visit_vital_signs enable row level security;

create policy "doctors_all_on_visit_vital_signs" on visit_vital_signs
  for all to authenticated using (is_doctor()) with check (is_doctor());
