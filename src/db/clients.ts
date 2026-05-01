import { supabase } from './client';

export interface Client {
  id: string;
  wa_id: string;
  email: string | null;
  name: string | null;
  phone: string | null;
  age: number | null;
  medical_history: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClientFields {
  email?: string;
  name?: string;
  phone?: string;
  age?: number;
  medical_history?: string;
}

export async function getClientByWaId(waId: string): Promise<Client | null> {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('wa_id', waId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getClientByEmail(email: string): Promise<Client | null> {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .ilike('email', email)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/**
 * Creates or updates the client row for the given wa_id.
 * Only the fields provided are written — existing fields are preserved.
 */
export async function upsertClient(waId: string, fields: ClientFields): Promise<Client> {
  const { data, error } = await supabase
    .from('clients')
    .upsert({ wa_id: waId, ...fields }, { onConflict: 'wa_id' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateClient(waId: string, fields: ClientFields): Promise<Client> {
  const { data, error } = await supabase
    .from('clients')
    .update({ ...fields })
    .eq('wa_id', waId)
    .select()
    .single();
  if (error) throw error;
  return data;
}
