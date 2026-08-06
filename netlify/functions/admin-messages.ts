import { Handler } from '@netlify/functions';
import { corsHeaders, jsonResponse, getSupabaseAdmin } from './_shared/supabaseAdmin';
import { verifyAdminToken, extractBearerToken } from './_shared/adminAuth';

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' };
  }

  const token = extractBearerToken(event.headers.authorization);
  if (!verifyAdminToken(token)) {
    return jsonResponse(401, { error: 'Non autorisé.' });
  }

  if (event.httpMethod !== 'GET') {
    return jsonResponse(405, { error: 'Method Not Allowed' });
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('me_contact_messages')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return jsonResponse(500, { error: error.message });
  return jsonResponse(200, { messages: data });
};
