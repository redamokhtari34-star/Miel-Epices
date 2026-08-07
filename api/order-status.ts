import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';
import { sendJson, applyCors, getSupabaseAdmin } from './_lib/supabaseAdmin.js';
import { confirmOrderPaid } from './_lib/confirmPayment.js';

let stripeClient: Stripe | null = null;

function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  if (!stripeClient) stripeClient = new Stripe(key);
  return stripeClient;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    applyCors(res);
    res.status(200).end();
    return;
  }
  if (req.method !== 'GET') {
    return sendJson(res, 405, { error: 'Method Not Allowed' });
  }

  const sessionId = (req.query.session_id as string) || '';
  if (!sessionId) {
    return sendJson(res, 400, { error: 'session_id requis.' });
  }

  const supabase = getSupabaseAdmin();
  const { data: order, error } = await supabase
    .from('me_orders')
    .select('id, customer_name, items, total, status, created_at')
    .eq('stripe_session_id', sessionId)
    .single();

  if (error || !order) {
    return sendJson(res, 404, { error: 'Commande introuvable.' });
  }

  // Only reveal the order once payment has actually been confirmed — never
  // trust the mere presence of a session_id in the URL as proof of payment.
  if (order.status === 'awaiting_payment') {
    // Don't just wait on the Stripe webhook (it can be missing/misconfigured,
    // e.g. no live-mode endpoint set up yet) — ask Stripe directly using the
    // same secret key that already created this session. Confirmation logic
    // is idempotent, so this is safe even if the webhook fires later too.
    const stripe = getStripe();
    if (stripe) {
      try {
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        if (session.payment_status === 'paid') {
          const confirmed = await confirmOrderPaid(sessionId);
          if (confirmed) {
            return sendJson(res, 200, { order: confirmed });
          }
        }
      } catch (err: any) {
        console.error('Direct Stripe session check failed:', err.message);
      }
    }
    return sendJson(res, 202, { status: 'awaiting_payment' });
  }

  return sendJson(res, 200, { order });
}
