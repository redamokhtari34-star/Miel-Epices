import { Handler } from '@netlify/functions';
import { corsHeaders, jsonResponse, getSupabaseAdmin } from './_shared/supabaseAdmin';
import { verifyAdminToken, extractBearerToken } from './_shared/adminAuth';

const ALLOWED_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};
// Kept under Lambda/Netlify's ~6MB request payload limit once base64-encoded.
const MAX_BYTES = 3 * 1024 * 1024;

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, { error: 'Method Not Allowed' });
  }

  const token = extractBearerToken(event.headers.authorization);
  if (!verifyAdminToken(token)) {
    return jsonResponse(401, { error: 'Non autorisé.' });
  }

  try {
    const { fileDataBase64, contentType } = JSON.parse(event.body || '{}');
    const ext = ALLOWED_TYPES[contentType];
    if (!fileDataBase64 || !ext) {
      return jsonResponse(400, { error: 'Format d\'image non supporté (JPEG, PNG, WEBP ou GIF uniquement).' });
    }

    const buffer = Buffer.from(fileDataBase64, 'base64');
    if (buffer.length > MAX_BYTES) {
      return jsonResponse(400, { error: 'Image trop volumineuse (3 Mo maximum).' });
    }

    const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const supabase = getSupabaseAdmin();
    const { error: uploadError } = await supabase.storage
      .from('me-product-images')
      .upload(path, buffer, { contentType, upsert: false });

    if (uploadError) {
      return jsonResponse(500, { error: uploadError.message });
    }

    const { data } = supabase.storage.from('me-product-images').getPublicUrl(path);
    return jsonResponse(200, { url: data.publicUrl });
  } catch (err: any) {
    return jsonResponse(400, { error: err.message || 'Requête invalide.' });
  }
};
