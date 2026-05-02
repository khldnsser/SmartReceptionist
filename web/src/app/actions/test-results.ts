'use server';

import { createAdminClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function updateTestResult(formData: FormData) {
  const admin = createAdminClient();
  const id = formData.get('id') as string;
  const clientId = formData.get('client_id') as string;
  const doctorLabel = (formData.get('doctor_label') as string) || null;
  const doctorNote = (formData.get('doctor_note') as string) || null;

  await admin
    .from('test_results')
    .update({ doctor_label: doctorLabel, doctor_note: doctorNote })
    .eq('id', id);

  revalidatePath(`/patients/${clientId}`);
}

export async function uploadTestResult(formData: FormData) {
  const admin = createAdminClient();
  const clientId = formData.get('client_id') as string;
  const file = formData.get('file') as File;
  const doctorLabel = (formData.get('doctor_label') as string) || null;

  if (!file || file.size === 0) return;

  const ext = file.name.split('.').pop() ?? 'bin';
  const storagePath = `${clientId}/${crypto.randomUUID()}.${ext}`;

  const arrayBuffer = await file.arrayBuffer();
  const { error: uploadError } = await admin.storage
    .from('patient-uploads')
    .upload(storagePath, arrayBuffer, { contentType: file.type });

  if (uploadError) {
    console.error('[TEST_RESULTS] Upload failed:', uploadError.message);
    return;
  }

  await admin.from('test_results').insert({
    client_id: clientId,
    storage_path: storagePath,
    file_name: file.name,
    mime_type: file.type,
    file_size_bytes: file.size,
    doctor_label: doctorLabel,
    uploaded_via: 'web',
  });

  revalidatePath(`/patients/${clientId}`);
}

export async function deleteTestResult(id: string, storagePath: string, clientId: string) {
  const admin = createAdminClient();

  const { error: storageError } = await admin.storage.from('patient-uploads').remove([storagePath]);
  if (storageError) {
    console.error('[TEST_RESULTS] Storage delete failed:', storageError.message, 'path:', storagePath);
  }

  await admin.from('test_results').delete().eq('id', id);
  revalidatePath(`/patients/${clientId}`);
}
