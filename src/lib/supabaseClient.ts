import { createClient } from '@supabase/supabase-js';

export const isSupabaseConfigured = Boolean(
  import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY
);

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string) || 'https://placeholder.supabase.co';
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || 'placeholder_anon_key';

if (!isSupabaseConfigured) {
  console.info('VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY non configurées. Mode catalogue démo actif.');
}

export const supabase = createClient<any, any, any>(supabaseUrl, supabaseAnonKey);
