'use server';

import { createAdminClient } from '@/lib/supabase/server';
import { createClient } from '@/lib/supabase/server';

type ActorSource = 'doctor' | 'agent' | 'system';
type ActionType = 'create' | 'update' | 'delete' | 'sign' | 'upload';

export async function logAudit(opts: {
  action: ActionType;
  source?: ActorSource;
  resourceType: string;
  resourceId: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
}) {
  const { action, source = 'doctor', resourceType, resourceId, before = null, after = null } = opts;

  // Get current doctor user id — fails silently so audit never breaks main flow
  let actorUserId: string | null = null;
  try {
    const authClient = await createClient();
    const { data } = await authClient.auth.getUser();
    actorUserId = data.user?.id ?? null;
  } catch {
    // non-fatal
  }

  const admin = createAdminClient();
  await admin.from('audit_logs').insert({
    action_type: action,
    actor_user_id: actorUserId,
    actor_source: source,
    resource_type: resourceType,
    resource_id: resourceId,
    before,
    after,
  });
}
