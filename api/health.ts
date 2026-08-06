import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sendJson } from './_lib/supabaseAdmin.js';

export default function handler(_req: VercelRequest, res: VercelResponse) {
  sendJson(res, 200, { status: 'ok' });
}
