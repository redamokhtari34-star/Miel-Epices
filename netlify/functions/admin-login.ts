import { Handler } from '@netlify/functions';
import { timingSafeEqual } from 'crypto';
import { corsHeaders, jsonResponse } from './_shared/supabaseAdmin';
import { createAdminToken } from './_shared/adminAuth';

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: corsHeaders, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, { error: 'Method Not Allowed' });
  }

  try {
    const { password } = JSON.parse(event.body || '{}');
    const adminPassword = process.env.ADMIN_PASSWORD || 'sidimabrouk2500';

    if (!password || typeof password !== 'string' || !safeEqual(password, adminPassword)) {
      return jsonResponse(401, { error: "Code d'accès incorrect." });
    }

    const token = createAdminToken();
    return jsonResponse(200, { token });
  } catch (err: any) {
    return jsonResponse(500, { error: err.message || 'Erreur serveur.' });
  }
};
