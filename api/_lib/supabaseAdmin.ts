import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { VercelResponse } from '@vercel/node';

// No generated Database type for this project yet, so we type the client as
// `any` rather than let every table default to Supabase's strict `never` schema.
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

export const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
};

export function applyCors(res: VercelResponse) {
  for (const [key, value] of Object.entries(corsHeaders)) {
    res.setHeader(key, value);
  }
}

export function sendJson(res: VercelResponse, statusCode: number, body: unknown) {
  applyCors(res);
  res.status(statusCode).json(body);
}
