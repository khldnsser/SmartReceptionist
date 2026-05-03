import { createClient } from '@supabase/supabase-js';
import { config } from '../../core/config';

export const supabase = createClient(
  config.supabase.url,
  config.supabase.serviceRoleKey,
  { auth: { persistSession: false } }
);
