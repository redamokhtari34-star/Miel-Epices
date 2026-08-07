import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sendJson } from './_lib/supabaseAdmin.js';
import { sendEmail } from './_lib/email.js';

// Temporary one-time endpoint to verify the mieletepices.fr sender domain
// actually delivers through Resend. Delete after use.
export default async function handler(_req: VercelRequest, res: VercelResponse) {
  try {
    await sendEmail({
      to: 'redamokhtari34@gmail.com',
      subject: 'Test — domaine mieletepices.fr vérifié',
      html: '<p>Ceci confirme que les emails partent bien depuis commandes@mieletepices.fr.</p>',
    });
    return sendJson(res, 200, { sent: true });
  } catch (err: any) {
    return sendJson(res, 500, { error: err.message });
  }
}
