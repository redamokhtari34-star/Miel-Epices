import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sendJson, applyCors, getSupabaseAdmin } from './_lib/supabaseAdmin.js';
import { verifyAdminToken, extractBearerToken } from './_lib/adminAuth.js';

const ALLOWED_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};
// Kept well under Vercel's ~4.5MB request body limit once base64-encoded.
const MAX_BYTES = 3 * 1024 * 1024;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    applyCors(res);
    res.status(200).end();
    return;
  }
  if (req.method !== 'POST') {
    return sendJson(res, 405, { error: 'Method Not Allowed' });
  }

  const token = extractBearerToken(req.headers.authorization as string | undefined);
  if (!verifyAdminToken(token)) {
    return sendJson(res, 401, { error: 'Non autorisé.' });
  }

  try {
    const { fileDataBase64, contentType } = req.body || {};
    const ext = ALLOWED_TYPES[contentType];
    if (!fileDataBase64 || !ext) {
      return sendJson(res, 400, { error: "Format d'image non supporté (JPEG, PNG, WEBP ou GIF uniquement)." });
    }

    const buffer = Buffer.from(fileDataBase64, 'base64');
    if (buffer.length > MAX_BYTES) {
      return sendJson(res, 400, { error: 'Image trop volumineuse (3 Mo maximum).' });
    }

    const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const supabase = getSupabaseAdmin();
    const { error: uploadError } = await supabase.storage
      .from('me-product-images')
      .upload(path, buffer, { contentType, upsert: false });

    if (uploadError) {
      return sendJson(res, 500, { error: uploadError.message });
    }

    const { data } = supabase.storage.from('me-product-images').getPublicUrl(path);
    return sendJson(res, 200, { url: data.publicUrl });
  } catch (err: any) {
    return sendJson(res, 400, { error: err.message || 'Requête invalide.' });
  }
}
