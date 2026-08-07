import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sendJson, getSupabaseAdmin } from './_lib/supabaseAdmin.js';
import { MIGRATE_IMAGES } from './_migrate_image_data.js';

// Temporary one-time re-upload endpoint — overwrites the corrupted Supabase
// Storage copies with the clean image bytes now bundled in the deployment.
// Delete this file once run.
export default async function handler(_req: VercelRequest, res: VercelResponse) {
  const supabase = getSupabaseAdmin();
  const results: Record<string, string> = {};
  const errors: Record<string, string> = {};

  for (const [filename, b64] of Object.entries(MIGRATE_IMAGES)) {
    const buffer = Buffer.from(b64, 'base64');
    const { error } = await supabase.storage
      .from('me-product-images')
      .upload(filename, buffer, { contentType: 'image/webp', upsert: true });

    if (error) {
      errors[filename] = error.message;
      continue;
    }
    const { data } = supabase.storage.from('me-product-images').getPublicUrl(filename);
    results[filename] = `${data.publicUrl} (${buffer.length} bytes)`;
  }

  return sendJson(res, 200, { results, errors });
}
