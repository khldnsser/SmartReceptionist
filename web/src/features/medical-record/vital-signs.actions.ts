'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/server';
import { logAudit } from '@/lib/audit';

export async function captureVitalSigns(formData: FormData) {
  const appointmentId = formData.get('appointment_id') as string;
  const clientId      = formData.get('client_id') as string;

  const parseNum = (key: string) => {
    const v = formData.get(key) as string;
    return v ? parseFloat(v) : null;
  };

  const payload = {
    appointment_id: appointmentId,
    client_id:      clientId,
    systolic_bp:    parseNum('systolic_bp'),
    diastolic_bp:   parseNum('diastolic_bp'),
    heart_rate:     parseNum('heart_rate'),
    temperature_c:  parseNum('temperature_c'),
    weight_kg:      parseNum('weight_kg'),
    height_cm:      parseNum('height_cm'),
    o2_saturation:  parseNum('o2_saturation'),
    notes:          (formData.get('notes') as string) || null,
  };

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('visit_vital_signs')
    .insert(payload)
    .select()
    .single();

  if (error) return { ok: false as const, error: error.message };

  await logAudit({ action: 'create', resourceType: 'visit_vital_signs', resourceId: data.id, after: data });
  revalidatePath(`/patients/${clientId}`);
  return { ok: true as const };
}

export async function getVitalSignsForClient(clientId: string, limit = 10) {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('visit_vital_signs')
    .select('*')
    .eq('client_id', clientId)
    .order('captured_at', { ascending: false })
    .limit(limit);

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getVitalSignsForAppointment(appointmentId: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from('visit_vital_signs')
    .select('*')
    .eq('appointment_id', appointmentId)
    .order('captured_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ?? null;
}
