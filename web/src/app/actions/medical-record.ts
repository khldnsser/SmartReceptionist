'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/server';
import { logAudit } from '@/lib/audit';

// ─── Allergies ────────────────────────────────────────────────────────────────

export async function addAllergy(formData: FormData) {
  const clientId  = formData.get('client_id') as string;
  const substance = formData.get('substance') as string;
  const reaction  = formData.get('reaction') as string;
  const severity  = formData.get('severity') as string;
  const notes     = (formData.get('notes') as string) || null;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('client_allergies')
    .insert({ client_id: clientId, substance, reaction, severity, notes })
    .select()
    .single();

  if (error) return { ok: false as const, error: error.message };

  await logAudit({ action: 'create', resourceType: 'client_allergies', resourceId: data.id, after: data });
  revalidatePath(`/patients/${clientId}`);
  return { ok: true as const };
}

export async function updateAllergy(formData: FormData) {
  const id        = formData.get('id') as string;
  const clientId  = formData.get('client_id') as string;
  const substance = formData.get('substance') as string;
  const reaction  = formData.get('reaction') as string;
  const severity  = formData.get('severity') as string;
  const notes     = (formData.get('notes') as string) || null;

  const admin = createAdminClient();
  const { data: before } = await admin.from('client_allergies').select().eq('id', id).single();
  const { error } = await admin
    .from('client_allergies')
    .update({ substance, reaction, severity, notes })
    .eq('id', id);

  if (error) return { ok: false as const, error: error.message };

  await logAudit({ action: 'update', resourceType: 'client_allergies', resourceId: id, before, after: { substance, reaction, severity, notes } });
  revalidatePath(`/patients/${clientId}`);
  return { ok: true as const };
}

export async function deleteAllergy(id: string, clientId: string) {
  const admin = createAdminClient();
  const { data: before } = await admin.from('client_allergies').select().eq('id', id).single();
  const { error } = await admin.from('client_allergies').delete().eq('id', id);

  if (error) return { ok: false as const, error: error.message };

  await logAudit({ action: 'delete', resourceType: 'client_allergies', resourceId: id, before });
  revalidatePath(`/patients/${clientId}`);
  return { ok: true as const };
}

// ─── Problems ─────────────────────────────────────────────────────────────────

export async function addProblem(formData: FormData) {
  const clientId   = formData.get('client_id') as string;
  const problem    = formData.get('problem') as string;
  const icd10Code  = (formData.get('icd10_code') as string) || null;
  const onsetDate  = (formData.get('onset_date') as string) || null;
  const status     = (formData.get('status') as string) || 'active';
  const notes      = (formData.get('notes') as string) || null;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('client_problems')
    .insert({ client_id: clientId, problem, icd10_code: icd10Code, onset_date: onsetDate, status, notes })
    .select()
    .single();

  if (error) return { ok: false as const, error: error.message };

  await logAudit({ action: 'create', resourceType: 'client_problems', resourceId: data.id, after: data });
  revalidatePath(`/patients/${clientId}`);
  return { ok: true as const };
}

export async function updateProblem(formData: FormData) {
  const id        = formData.get('id') as string;
  const clientId  = formData.get('client_id') as string;
  const problem   = formData.get('problem') as string;
  const icd10Code = (formData.get('icd10_code') as string) || null;
  const onsetDate = (formData.get('onset_date') as string) || null;
  const status    = formData.get('status') as string;
  const notes     = (formData.get('notes') as string) || null;

  const admin = createAdminClient();
  const { data: before } = await admin.from('client_problems').select().eq('id', id).single();
  const { error } = await admin
    .from('client_problems')
    .update({ problem, icd10_code: icd10Code, onset_date: onsetDate, status, notes })
    .eq('id', id);

  if (error) return { ok: false as const, error: error.message };

  await logAudit({ action: 'update', resourceType: 'client_problems', resourceId: id, before, after: { problem, icd10_code: icd10Code, onset_date: onsetDate, status, notes } });
  revalidatePath(`/patients/${clientId}`);
  return { ok: true as const };
}

export async function deleteProblem(id: string, clientId: string) {
  const admin = createAdminClient();
  const { data: before } = await admin.from('client_problems').select().eq('id', id).single();
  const { error } = await admin.from('client_problems').delete().eq('id', id);

  if (error) return { ok: false as const, error: error.message };

  await logAudit({ action: 'delete', resourceType: 'client_problems', resourceId: id, before });
  revalidatePath(`/patients/${clientId}`);
  return { ok: true as const };
}

// ─── Medications ──────────────────────────────────────────────────────────────

export async function addMedication(formData: FormData) {
  const clientId   = formData.get('client_id') as string;
  const drugName   = formData.get('drug_name') as string;
  const dose       = formData.get('dose') as string;
  const frequency  = formData.get('frequency') as string;
  const startDate  = formData.get('start_date') as string;
  const endDate    = (formData.get('end_date') as string) || null;
  const indication = (formData.get('indication') as string) || null;
  const notes      = (formData.get('notes') as string) || null;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('client_medications')
    .insert({ client_id: clientId, drug_name: drugName, dose, frequency, start_date: startDate, end_date: endDate, indication, notes })
    .select()
    .single();

  if (error) return { ok: false as const, error: error.message };

  await logAudit({ action: 'create', resourceType: 'client_medications', resourceId: data.id, after: data });
  revalidatePath(`/patients/${clientId}`);
  return { ok: true as const };
}

export async function updateMedication(formData: FormData) {
  const id         = formData.get('id') as string;
  const clientId   = formData.get('client_id') as string;
  const drugName   = formData.get('drug_name') as string;
  const dose       = formData.get('dose') as string;
  const frequency  = formData.get('frequency') as string;
  const startDate  = formData.get('start_date') as string;
  const endDate    = (formData.get('end_date') as string) || null;
  const indication = (formData.get('indication') as string) || null;
  const notes      = (formData.get('notes') as string) || null;

  const admin = createAdminClient();
  const { data: before } = await admin.from('client_medications').select().eq('id', id).single();
  const { error } = await admin
    .from('client_medications')
    .update({ drug_name: drugName, dose, frequency, start_date: startDate, end_date: endDate, indication, notes })
    .eq('id', id);

  if (error) return { ok: false as const, error: error.message };

  await logAudit({ action: 'update', resourceType: 'client_medications', resourceId: id, before, after: { drug_name: drugName, dose, frequency, start_date: startDate, end_date: endDate, indication, notes } });
  revalidatePath(`/patients/${clientId}`);
  return { ok: true as const };
}

export async function deleteMedication(id: string, clientId: string) {
  const admin = createAdminClient();
  const { data: before } = await admin.from('client_medications').select().eq('id', id).single();
  const { error } = await admin.from('client_medications').delete().eq('id', id);

  if (error) return { ok: false as const, error: error.message };

  await logAudit({ action: 'delete', resourceType: 'client_medications', resourceId: id, before });
  revalidatePath(`/patients/${clientId}`);
  return { ok: true as const };
}

// ─── Family History ───────────────────────────────────────────────────────────

export async function addFamilyHistory(formData: FormData) {
  const clientId  = formData.get('client_id') as string;
  const relation  = formData.get('relation') as string;
  const condition = formData.get('condition') as string;
  const notes     = (formData.get('notes') as string) || null;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('client_family_history')
    .insert({ client_id: clientId, relation, condition, notes })
    .select()
    .single();

  if (error) return { ok: false as const, error: error.message };

  await logAudit({ action: 'create', resourceType: 'client_family_history', resourceId: data.id, after: data });
  revalidatePath(`/patients/${clientId}`);
  return { ok: true as const };
}

export async function updateFamilyHistory(formData: FormData) {
  const id        = formData.get('id') as string;
  const clientId  = formData.get('client_id') as string;
  const relation  = formData.get('relation') as string;
  const condition = formData.get('condition') as string;
  const notes     = (formData.get('notes') as string) || null;

  const admin = createAdminClient();
  const { data: before } = await admin.from('client_family_history').select().eq('id', id).single();
  const { error } = await admin
    .from('client_family_history')
    .update({ relation, condition, notes })
    .eq('id', id);

  if (error) return { ok: false as const, error: error.message };

  await logAudit({ action: 'update', resourceType: 'client_family_history', resourceId: id, before, after: { relation, condition, notes } });
  revalidatePath(`/patients/${clientId}`);
  return { ok: true as const };
}

export async function deleteFamilyHistory(id: string, clientId: string) {
  const admin = createAdminClient();
  const { data: before } = await admin.from('client_family_history').select().eq('id', id).single();
  const { error } = await admin.from('client_family_history').delete().eq('id', id);

  if (error) return { ok: false as const, error: error.message };

  await logAudit({ action: 'delete', resourceType: 'client_family_history', resourceId: id, before });
  revalidatePath(`/patients/${clientId}`);
  return { ok: true as const };
}

// ─── Social History ───────────────────────────────────────────────────────────

export async function upsertSocialHistory(formData: FormData) {
  const clientId        = formData.get('client_id') as string;
  const smokingStatus   = (formData.get('smoking_status') as string) || null;
  const smokingDetails  = (formData.get('smoking_details') as string) || null;
  const alcoholUse      = (formData.get('alcohol_use') as string) || null;
  const alcoholDetails  = (formData.get('alcohol_details') as string) || null;
  const drugUse         = (formData.get('drug_use') as string) || null;
  const drugUseDetails  = (formData.get('drug_use_details') as string) || null;
  const occupation      = (formData.get('occupation') as string) || null;
  const livingSituation = (formData.get('living_situation') as string) || null;
  const otherNotes      = (formData.get('other_notes') as string) || null;

  const fields = {
    smoking_status: smokingStatus,
    smoking_details: smokingDetails,
    alcohol_use: alcoholUse,
    alcohol_details: alcoholDetails,
    drug_use: drugUse,
    drug_use_details: drugUseDetails,
    occupation,
    living_situation: livingSituation,
    other_notes: otherNotes,
  };

  const admin = createAdminClient();
  const { data: before } = await admin.from('client_social_history').select().eq('client_id', clientId).maybeSingle();
  const { data, error } = await admin
    .from('client_social_history')
    .upsert({ client_id: clientId, ...fields }, { onConflict: 'client_id' })
    .select()
    .single();

  if (error) return { ok: false as const, error: error.message };

  await logAudit({ action: before ? 'update' : 'create', resourceType: 'client_social_history', resourceId: data.id, before, after: fields });
  revalidatePath(`/patients/${clientId}`);
  return { ok: true as const };
}
