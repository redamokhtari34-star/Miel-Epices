import { createClient } from '@supabase/supabase-js';

// The Supabase URL and anon/publishable key are public by design (Supabase's
// own security model relies on Row Level Security policies, not on keeping
// this key secret — it is always visible in the browser bundle anyway).
// Hardcoded here instead of read from VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY
// because those env vars have repeatedly ended up corrupted with stray
// characters when pasted into the hosting dashboard, silently breaking every
// client-side product fetch while leaving server-side (service role) calls
// unaffected. A wrong/missing value here can only ever come from an edit to
// this file, never from a dashboard paste mistake.
const supabaseUrl = 'https://ldmwnqbuwryqnoftbxfh.supabase.co';
const supabaseAnonKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkbXducWJ1d3J5cW5vZnRieGZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ2Mjg0MzcsImV4cCI6MjEwMDIwNDQzN30.KGfRTpmEF1eLV7yB9tTzhSayqyf0BT7PpVUQpDhsMzA';

export const isSupabaseConfigured = true;

export const supabase = createClient<any, any, any>(supabaseUrl, supabaseAnonKey);
