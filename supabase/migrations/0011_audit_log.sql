-- ============================================================
-- 0011_audit_log.sql  –  Audit trail for all clinical mutations
--
-- NOTE: Trigger-based capture is skipped because the PMS uses
-- the service-role key (createAdminClient), which bypasses
-- auth.uid() and session settings.  Audit rows are inserted
-- explicitly by server actions via the logAudit() helper in
-- web/src/lib/audit.ts.  The agent server logs with source='agent'.
-- ============================================================

create type audit_actor_source as enum ('doctor', 'agent', 'system');

create table if not exists audit_logs (
  id              uuid               primary key default gen_random_uuid(),
  action_type     text               not null,        -- 'create' | 'update' | 'delete' | 'sign' | 'upload'
  actor_user_id   uuid,                               -- null when agent / system
  actor_source    audit_actor_source not null default 'system',
  resource_type   text               not null,        -- table name
  resource_id     uuid               not null,
  before          jsonb,
  after           jsonb,
  created_at      timestamptz        not null default now()
);

create index if not exists audit_logs_resource_idx
  on audit_logs (resource_type, resource_id, created_at desc);
create index if not exists audit_logs_actor_idx
  on audit_logs (actor_user_id, created_at desc);
create index if not exists audit_logs_created_at_idx
  on audit_logs (created_at desc);

-- Audit logs are append-only.
-- Doctors can read; inserts happen via service-role (server actions).
alter table audit_logs enable row level security;

create policy "doctors_read_audit_logs" on audit_logs
  for select to authenticated using (is_doctor());
