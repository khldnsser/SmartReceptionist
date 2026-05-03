-- ============================================================
-- 0010_summary_signing.sql  –  Immutable visit summaries + addendums
-- ============================================================

-- Extend visit_summaries with signing metadata
alter table visit_summaries
  add column if not exists signed_at  timestamptz,
  add column if not exists signed_by  uuid references auth.users (id);

-- Prevent any UPDATE on a signed summary (except the sign action itself)
create or replace function enforce_summary_immutable()
returns trigger language plpgsql as $$
begin
  -- If the OLD row was already signed, block all further updates
  if old.signed_at is not null then
    raise exception 'Visit summary % is signed and cannot be edited. Add an addendum instead.', old.id
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger visit_summaries_immutable_after_sign
  before update on visit_summaries
  for each row
  when (old.signed_at is not null)
  execute procedure enforce_summary_immutable();

-- ── visit_summary_addendums ──────────────────────────────────

create table if not exists visit_summary_addendums (
  id          uuid        primary key default gen_random_uuid(),
  summary_id  uuid        not null references visit_summaries (id) on delete cascade,
  added_by    uuid        not null references auth.users (id),
  content     text        not null,
  created_at  timestamptz not null default now()
);

create index if not exists visit_summary_addendums_summary_id_idx
  on visit_summary_addendums (summary_id, created_at asc);

-- ── RLS ──────────────────────────────────────────────────────

alter table visit_summary_addendums enable row level security;

create policy "doctors_all_on_addendums" on visit_summary_addendums
  for all to authenticated using (is_doctor()) with check (is_doctor());
