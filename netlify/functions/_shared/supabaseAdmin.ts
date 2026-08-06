import { createClient, SupabaseClient } from '@supabase/supabase-js';

// No generated Database type for this project yet, so we type the client as
// `any` rather than let every table default to Supabase's strict `never` schema.
// (Touched again to force a fresh function rebuild after correcting a stray
// character in SUPABASE_SERVICE_ROLE_KEY.)
let client: SupabaseClient<any, any, any> | null = null;

export function getSupabaseAdmin() {
  if (!client) {
    const url = process.env.SUPABASE_URL || 'https://placeholder.supabase.co';
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder_service_role_key';
    client = createClient<any, any, any>(url, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return client;
}

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
};

export function jsonResponse(statusCode: number, body: unknown) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
    body: JSON.stringify(body),
  };
}
