import { supabase } from '../infra/supabase/client';
import { getClientByWaId } from './client.repo';

export interface PatientAllergy {
  id: string;
  substance: string;
  reaction: string | null;
}

export interface PatientMedication {
  id: string;
  drug_name: string;
  dose: string | null;
  frequency: string | null;
}

export interface PatientProblem {
  id: string;
  problem: string;
}

export interface PatientFamilyHistory {
  id: string;
  relation: string;
  condition: string;
}

export interface PatientSocialHistory {
  smoking_status: string | null;
  alcohol_status: string | null;
  drug_use_status: string | null;
  occupation: string | null;
  living_situation: string | null;
}

export interface PatientTestResultSummary {
  id: string;
  file_name: string | null;
  created_at: string;
  patient_note: string | null;
  mime_type: string | null;
}

async function resolveClientId(waId: string): Promise<string | null> {
  const client = await getClientByWaId(waId);
  return client?.id ?? null;
}

export async function getAllergiesForWaId(waId: string): Promise<PatientAllergy[]> {
  const clientId = await resolveClientId(waId);
  if (!clientId) return [];
  const { data, error } = await supabase
    .from('client_allergies')
    .select('id, substance, reaction')
    .eq('client_id', clientId)
    .order('created_at', { ascending: true });
  if (error) throw new Error(`${error.message} [${error.code}]`);
  return (data ?? []) as PatientAllergy[];
}

export async function getMedicationsForWaId(waId: string): Promise<PatientMedication[]> {
  const clientId = await resolveClientId(waId);
  if (!clientId) return [];
  const { data, error } = await supabase
    .from('client_medications')
    .select('id, drug_name, dose, frequency')
    .eq('client_id', clientId)
    .is('end_date', null)
    .order('start_date', { ascending: false });
  if (error) throw new Error(`${error.message} [${error.code}]`);
  return (data ?? []) as PatientMedication[];
}

export async function getProblemsForWaId(waId: string): Promise<PatientProblem[]> {
  const clientId = await resolveClientId(waId);
  if (!clientId) return [];
  const { data, error } = await supabase
    .from('client_problems')
    .select('id, problem')
    .eq('client_id', clientId)
    .eq('status', 'active')
    .order('created_at', { ascending: true });
  if (error) throw new Error(`${error.message} [${error.code}]`);
  return (data ?? []) as PatientProblem[];
}

export async function getFamilyHistoryForWaId(waId: string): Promise<PatientFamilyHistory[]> {
  const clientId = await resolveClientId(waId);
  if (!clientId) return [];
  const { data, error } = await supabase
    .from('client_family_history')
    .select('id, relation, condition')
    .eq('client_id', clientId)
    .order('created_at', { ascending: true });
  if (error) throw new Error(`${error.message} [${error.code}]`);
  return (data ?? []) as PatientFamilyHistory[];
}

export async function getSocialHistoryForWaId(waId: string): Promise<PatientSocialHistory | null> {
  const clientId = await resolveClientId(waId);
  if (!clientId) return null;
  const { data, error } = await supabase
    .from('client_social_history')
    .select('smoking_status, alcohol_status, drug_use_status, occupation, living_situation')
    .eq('client_id', clientId)
    .maybeSingle();
  if (error) throw new Error(`${error.message} [${error.code}]`);
  return (data ?? null) as PatientSocialHistory | null;
}

export async function getTestResultsListForWaId(waId: string): Promise<PatientTestResultSummary[]> {
  const clientId = await resolveClientId(waId);
  if (!clientId) return [];
  const { data, error } = await supabase
    .from('test_results')
    .select('id, file_name, created_at, patient_note, mime_type')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(`${error.message} [${error.code}]`);
  return (data ?? []) as PatientTestResultSummary[];
}
