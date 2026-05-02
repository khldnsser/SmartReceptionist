import { supabase } from '../db/client';

const BUCKET = 'patient-uploads';

/**
 * Uploads a media buffer to Supabase Storage under {waId}/{timestamp}_{fileName}.
 * Returns the storage path on success.
 */
export async function uploadMediaToStorage(
  waId: string,
  buffer: Buffer,
  fileName: string,
  mimeType: string,
): Promise<string> {
  const sanitized = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `${waId}/${Date.now()}_${sanitized}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, buffer, { contentType: mimeType, upsert: false });

  if (error) throw new Error(`Storage upload failed: ${error.message}`);
  return path;
}

/** Returns a signed URL for the given storage path (default 1-hour expiry). */
export async function getSignedUrl(storagePath: string, expiresInSeconds = 3600): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, expiresInSeconds);
  if (error) throw new Error(`Signed URL failed: ${error.message}`);
  return data.signedUrl;
}
