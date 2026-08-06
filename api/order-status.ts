import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sendJson, applyCors, getSupabaseAdmin } from './_lib/supabaseAdmin.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    applyCors(res);
    res.status(200).end();
    return;
  }
  if (req.method !== 'GET') {
    return sendJson(res, 405, { error: 'Method Not Allowed' });
  }

  const sessionId = (req.query.session_id as string) || '';
  if (!sessionId) {
    return sendJson(res, 400, { error: 'session_id requis.' });
  }

  const supabase = getSupabaseAdmin();
  const { data: order, error } = await supabase
    .from('me_orders')
    .select('id, customer_name, items, total, status, created_at')
    .eq('stripe_session_id', sessionId)
    .single();

  if (error || !order) {
    return sendJson(res, 404, { error: 'Commande introuvable.' });
  }

  // Only reveal the order once the Stripe webhook has actually confirmed payment —
  // never trust the mere presence of a session_id in the URL as proof of payment.
  if (order.status === 'awaiting_payment') {
    return sendJson(res, 202, { status: 'awaiting_payment' });
  }

  return sendJson(res, 200, { order });
}
