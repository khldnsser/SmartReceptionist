import { supabase } from './client';

export interface VisitSummary {
  id: string;
  client_id: string;
  appointment_id: string | null;
  diagnosis: string | null;
  notes: string | null;
  treatment: string | null;
  follow_up: string | null;
  created_at: string;
  updated_at: string;
}

export interface VisitSummaryInput {
  appointment_id?: string;
  diagnosis?: string;
  notes?: string;
  treatment?: string;
  follow_up?: string;
}

export async function getLatestVisitSummary(clientId: string): Promise<VisitSummary | null> {
  const { data, error } = await supabase
    .from('visit_summaries')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`${error.message} [${error.code}]`);
  return data;
}

export async function listVisitSummaries(clientId: string): Promise<VisitSummary[]> {
  const { data, error } = await supabase
    .from('visit_summaries')
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(`${error.message} [${error.code}]`);
  return data ?? [];
}

export async function createVisitSummary(
  clientId: string,
  fields: VisitSummaryInput,
): Promise<VisitSummary> {
  const { data, error } = await supabase
    .from('visit_summaries')
    .insert({ client_id: clientId, ...fields })
    .select()
    .single();
  if (error) throw new Error(`${error.message} [${error.code}]`);
  return data;
}

export async function updateVisitSummary(
  summaryId: string,
  fields: Partial<VisitSummaryInput>,
): Promise<VisitSummary> {
  const { data, error } = await supabase
    .from('visit_summaries')
    .update(fields)
    .eq('id', summaryId)
    .select()
    .single();
  if (error) throw new Error(`${error.message} [${error.code}]`);
  return data;
}
