'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/server';

export async function createClientAction(fields: {
  name: string;
  phone?: string;
  email?: string;
  age?: number | null;
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  if (!fields.name.trim()) return { ok: false, error: 'Name is required' };
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('clients')
    .insert({ wa_id: null, ...fields })
    .select('id')
    .single();
  if (error) return { ok: false, error: error.message };
  revalidatePath('/patients');
  return { ok: true, id: data.id as string };
}

export async function sendAdHocMessageAction(
  clientId: string,
  text: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!text.trim()) return { ok: false, error: 'Message cannot be empty' };

  const supabase = createAdminClient();
  const { data: client } = await supabase
    .from('clients')
    .select('wa_id, name')
    .eq('id', clientId)
    .single();

  if (!client?.wa_id) {
    return { ok: false, error: 'Patient has no WhatsApp account linked yet' };
  }

  const agentUrl = process.env.AGENT_URL;
  const token = process.env.INTERNAL_API_TOKEN;
  if (!agentUrl || !token) {
    return { ok: false, error: 'Agent server not configured' };
  }

  try {
    const res = await fetch(`${agentUrl}/internal/send-message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-internal-token': token },
      body: JSON.stringify({ waId: client.wa_id, text }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { ok: false, error: (body as { error?: string }).error ?? `Agent returned ${res.status}` };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Request failed' };
  }
}

export async function updateClientAction(
  clientId: string,
  fields: {
    name?: string;
    email?: string;
    phone?: string;
    age?: number | null;
    medical_history?: string;
  },
): Promise<{ ok: boolean; error?: string }> {
  const supabase = createAdminClient();

  const { error } = await supabase
    .from('clients')
    .update(fields)
    .eq('id', clientId);

  if (error) return { ok: false, error: error.message };

  revalidatePath(`/patients/${clientId}`);
  revalidatePath('/patients');
  return { ok: true };
}
