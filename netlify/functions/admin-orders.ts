import { Handler } from '@netlify/functions';
import { corsHeaders, jsonResponse, getSupabaseAdmin } from './_shared/supabaseAdmin';
import { verifyAdminToken, extractBearerToken } from './_shared/adminAuth';

const NEXT_STATUS: Record<string, string> = {
  pending: 'preparing',
  preparing: 'shipped',
  shipped: 'pending',
};

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' };
  }

  const token = extractBearerToken(event.headers.authorization);
  if (!verifyAdminToken(token)) {
    return jsonResponse(401, { error: 'Non autorisé.' });
  }

  const supabase = getSupabaseAdmin();

  if (event.httpMethod === 'GET') {
    const { data, error } = await supabase
      .from('me_orders')
      .select('*')
      .neq('status', 'awaiting_payment')
      .order('created_at', { ascending: false });

    if (error) return jsonResponse(500, { error: error.message });
    return jsonResponse(200, { orders: data });
  }

  if (event.httpMethod === 'PATCH') {
    try {
      const { orderId } = JSON.parse(event.body || '{}');
      const { data: existing, error: fetchError } = await supabase
        .from('me_orders')
        .select('status')
        .eq('id', orderId)
        .single();

      if (fetchError || !existing) return jsonResponse(404, { error: 'Commande introuvable.' });

      const nextStatus = NEXT_STATUS[existing.status as string] || existing.status;
      const { data, error } = await supabase
        .from('me_orders')
        .update({ status: nextStatus })
        .eq('id', orderId)
        .select()
        .single();

      if (error) return jsonResponse(500, { error: error.message });
      return jsonResponse(200, { order: data });
    } catch (err: any) {
      return jsonResponse(400, { error: err.message || 'Requête invalide.' });
    }
  }

  return jsonResponse(405, { error: 'Method Not Allowed' });
};
