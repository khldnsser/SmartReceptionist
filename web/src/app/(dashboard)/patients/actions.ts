'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/server';

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
