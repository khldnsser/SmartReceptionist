import { supabase } from '../infra/supabase/client';
import { getClientByWaId } from './client.repo';
import { logger } from '../core/logger';

export interface TestResult {
  id: string;
  client_id: string;
  storage_path: string;
  mime_type: string | null;
  file_name: string | null;
  file_size_bytes: number | null;
  patient_note: string | null;
  doctor_label: string | null;
  doctor_note: string | null;
  uploaded_via: 'whatsapp' | 'web';
  created_at: string;
}

export interface TestResultInput {
  storage_path: string;
  mime_type?: string;
  file_name?: string;
  file_size_bytes?: number;
  patient_note?: string;
  uploaded_via?: 'whatsapp' | 'web';
}

export async function createTestResult(
  clientId: string,
  fields: TestResultInput,
): Promise<TestResult> {
  const { data, error } = await supabase
    .from('test_results')
    .insert({ client_id: clientId, uploaded_via: 'whatsapp', ...fields })
    .select()
    .single();
  if (error) throw new Error(`${error.message} [${error.code}]`);
  return data;
}

export async function createTestResultForWaId(
  waId: string,
  fields: TestResultInput,
): Promise<TestResult | null> {
  const client = await getClientByWaId(waId);
  if (!client) {
    logger.warn({ waId }, '[test-result.repo] No client for wa_id — test result not linked');
    return null;
  }
  return createTestResult(client.id, fields);
}

export async function listTestResults(clientId: string): Promise<TestResult[]> {
  const { data, error } = await supabase
    .from('test_results')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(`${error.message} [${error.code}]`);
  return data ?? [];
}

export async function updateTestResult(
  resultId: string,
  fields: { doctor_label?: string; doctor_note?: string },
): Promise<TestResult> {
  const { data, error } = await supabase
    .from('test_results')
    .update(fields)
    .eq('id', resultId)
    .select()
    .single();
  if (error) throw new Error(`${error.message} [${error.code}]`);
  return data;
}

export async function getSignedUrl(storagePath: string, expiresInSeconds = 3600): Promise<string> {
  const { data, error } = await supabase.storage
    .from('patient-uploads')
    .createSignedUrl(storagePath, expiresInSeconds);
  if (error) throw new Error(error.message);
  return data.signedUrl;
}
