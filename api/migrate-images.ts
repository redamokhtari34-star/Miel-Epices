import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sendJson, getSupabaseAdmin } from './_lib/supabaseAdmin.js';
import { MIGRATE_IMAGES } from './_migrate_image_data.js';

// Temporary one-time migration endpoint — uploads the static /public/images
// files to Supabase Storage since Vercel's static file serving was found to
// truncate these binaries in production. Delete this file once run.
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
    results[filename] = data.publicUrl;
  }

  return sendJson(res, 200, { results, errors });
}
