'use server';

import { createAdminClient, createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { logAudit } from '@/lib/audit';

export async function saveVisitSummary(formData: FormData) {
  const admin = createAdminClient();
  const id = formData.get('id') as string | null;
  const clientId = formData.get('client_id') as string;
  const appointmentId = (formData.get('appointment_id') as string) || null;
  const diagnosis = (formData.get('diagnosis') as string) || null;
  const notes = (formData.get('notes') as string) || null;
  const treatment = (formData.get('treatment') as string) || null;
  const followUp = (formData.get('follow_up') as string) || null;

  let error;
  if (id) {
    ({ error } = await admin
      .from('visit_summaries')
      .update({ diagnosis, notes, treatment, follow_up: followUp })
      .eq('id', id));
  } else {
    ({ error } = await admin
      .from('visit_summaries')
      .insert({ client_id: clientId, appointment_id: appointmentId, diagnosis, notes, treatment, follow_up: followUp }));
  }

  if (error) return { ok: false as const, error: error.message };
  revalidatePath(`/patients/${clientId}`);
  return { ok: true as const };
}

export async function getVisitSummaryByAppointmentId(appointmentId: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from('visit_summaries')
    .select('id, diagnosis, notes, treatment, follow_up')
    .eq('appointment_id', appointmentId)
    .maybeSingle();
  return data ?? null;
}

export async function deleteVisitSummary(id: string, clientId: string) {
  const admin = createAdminClient();
  const { data: before } = await admin.from('visit_summaries').select().eq('id', id).single();
  const { error } = await admin.from('visit_summaries').delete().eq('id', id);
  if (error) return { ok: false as const, error: error.message };
  await logAudit({ action: 'delete', resourceType: 'visit_summaries', resourceId: id, before });
  revalidatePath(`/patients/${clientId}`);
  return { ok: true as const };
}

export async function signVisitSummary(summaryId: string, clientId: string) {
  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return { ok: false as const, error: 'Not authenticated' };

  const admin = createAdminClient();
  const { data: before } = await admin.from('visit_summaries').select().eq('id', summaryId).single();

  if (before?.signed_at) return { ok: false as const, error: 'Already signed' };

  const { error } = await admin
    .from('visit_summaries')
    .update({ signed_at: new Date().toISOString(), signed_by: user.id })
    .eq('id', summaryId);

  if (error) return { ok: false as const, error: error.message };

  await logAudit({ action: 'sign', resourceType: 'visit_summaries', resourceId: summaryId, before, after: { signed_at: new Date().toISOString(), signed_by: user.id } });
  revalidatePath(`/patients/${clientId}`);
  return { ok: true as const };
}

export async function addAddendum(formData: FormData) {
  const summaryId = formData.get('summary_id') as string;
  const clientId  = formData.get('client_id') as string;
  const content   = formData.get('content') as string;

  if (!content?.trim()) return { ok: false as const, error: 'Content required' };

  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return { ok: false as const, error: 'Not authenticated' };

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('visit_summary_addendums')
    .insert({ summary_id: summaryId, added_by: user.id, content: content.trim() })
    .select()
    .single();

  if (error) return { ok: false as const, error: error.message };

  await logAudit({ action: 'create', resourceType: 'visit_summary_addendums', resourceId: data.id, after: data });
  revalidatePath(`/patients/${clientId}`);
  return { ok: true as const };
}

export async function getAddendumsBySummary(summaryId: string) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('visit_summary_addendums')
    .select('id, content, added_by, created_at')
    .eq('summary_id', summaryId)
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message);
  return data ?? [];
}
