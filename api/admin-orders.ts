import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sendJson, applyCors, getSupabaseAdmin } from './_lib/supabaseAdmin.js';
import { verifyAdminToken, extractBearerToken } from './_lib/adminAuth.js';

const NEXT_STATUS: Record<string, string> = {
  pending: 'preparing',
  preparing: 'shipped',
  shipped: 'pending',
};

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

  const supabase = getSupabaseAdmin();

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('me_orders')
      .select('*')
      .neq('status', 'awaiting_payment')
      .order('created_at', { ascending: false });

    if (error) return sendJson(res, 500, { error: error.message });
    return sendJson(res, 200, { orders: data });
  }

  if (req.method === 'PATCH') {
    try {
      const { orderId } = req.body || {};
      const { data: existing, error: fetchError } = await supabase
        .from('me_orders')
        .select('status')
        .eq('id', orderId)
        .single();

      if (fetchError || !existing) return sendJson(res, 404, { error: 'Commande introuvable.' });

      const nextStatus = NEXT_STATUS[existing.status as string] || existing.status;
      const { data, error } = await supabase
        .from('me_orders')
        .update({ status: nextStatus })
        .eq('id', orderId)
        .select()
        .single();

      if (error) return sendJson(res, 500, { error: error.message });
      return sendJson(res, 200, { order: data });
    } catch (err: any) {
      return sendJson(res, 400, { error: err.message || 'Requête invalide.' });
    }
  }

  return sendJson(res, 405, { error: 'Method Not Allowed' });
}
