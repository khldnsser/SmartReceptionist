'use server';

import { createAdminClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function saveVisitSummary(formData: FormData) {
  const admin = createAdminClient();
  const id = formData.get('id') as string | null;
  const clientId = formData.get('client_id') as string;
  const appointmentId = (formData.get('appointment_id') as string) || null;
  const diagnosis = (formData.get('diagnosis') as string) || null;
  const notes = (formData.get('notes') as string) || null;
  const treatment = (formData.get('treatment') as string) || null;
  const followUp = (formData.get('follow_up') as string) || null;

  if (id) {
    await admin
      .from('visit_summaries')
      .update({ diagnosis, notes, treatment, follow_up: followUp })
      .eq('id', id);
  } else {
    await admin
      .from('visit_summaries')
      .insert({ client_id: clientId, appointment_id: appointmentId, diagnosis, notes, treatment, follow_up: followUp });
  }

  revalidatePath(`/patients/${clientId}`);
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
  await admin.from('visit_summaries').delete().eq('id', id);
  revalidatePath(`/patients/${clientId}`);
}
