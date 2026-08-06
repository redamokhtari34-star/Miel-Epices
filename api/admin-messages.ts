import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sendJson, applyCors, getSupabaseAdmin } from './_lib/supabaseAdmin.js';
import { verifyAdminToken, extractBearerToken } from './_lib/adminAuth.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    applyCors(res);
    res.status(200).end();
    return;
  }

  const token = extractBearerToken(req.headers.authorization as string | undefined);
  if (!verifyAdminToken(token)) {
    return sendJson(res, 401, { error: 'Non autorisé.' });
  }

  if (req.method !== 'GET') {
    return sendJson(res, 405, { error: 'Method Not Allowed' });
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('me_contact_messages')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return sendJson(res, 500, { error: error.message });
  return sendJson(res, 200, { messages: data });
}
