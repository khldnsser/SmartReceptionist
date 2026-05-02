-- ============================================================
-- 0004_storage_bucket.sql  –  Supabase Storage bucket for patient uploads
-- ============================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'patient-uploads',
  'patient-uploads',
  false,
  52428800,  -- 50 MB per file
  array[
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/heic',
    'application/pdf'
  ]
)
on conflict (id) do nothing;
