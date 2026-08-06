import type { VercelRequest, VercelResponse } from '@vercel/node';
import { timingSafeEqual } from 'crypto';
import { sendJson, applyCors } from './_lib/supabaseAdmin.js';
import { createAdminToken } from './_lib/adminAuth.js';

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    applyCors(res);
    res.status(200).end();
    return;
  }
  if (req.method !== 'POST') return sendJson(res, 405, { error: 'Method Not Allowed' });

  try {
    const { password } = req.body || {};
    const adminPassword = process.env.ADMIN_PASSWORD || 'sidimabrouk2500';

    if (!password || typeof password !== 'string' || !safeEqual(password, adminPassword)) {
      return sendJson(res, 401, { error: "Code d'accès incorrect." });
    }

    const token = createAdminToken();
    return sendJson(res, 200, { token });
  } catch (err: any) {
    return sendJson(res, 500, { error: err.message || 'Erreur serveur.' });
  }
}
