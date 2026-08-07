import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sendJson } from './_lib/supabaseAdmin.js';

// Temporary diagnostic endpoint — reports whether required env vars are
// present (never their values). Remove this file once verified.
export default async function handler(_req: VercelRequest, res: VercelResponse) {
  const presence = {
    SUPABASE_URL: !!process.env.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    STRIPE_SECRET_KEY: !!process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: !!process.env.STRIPE_WEBHOOK_SECRET,
    ADMIN_PASSWORD: !!process.env.ADMIN_PASSWORD,
    ADMIN_SESSION_SECRET: !!process.env.ADMIN_SESSION_SECRET,
    RESEND_API_KEY: !!process.env.RESEND_API_KEY,
    APP_URL: !!process.env.APP_URL,
  };
  sendJson(res, 200, { envVarsPresent: presence });
}
