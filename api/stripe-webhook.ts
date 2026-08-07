import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';
import { sendJson } from './_lib/supabaseAdmin.js';
import { confirmOrderPaid } from './_lib/confirmPayment.js';

// Stripe signature verification needs the exact raw request bytes, so the
// platform's automatic JSON body parsing must be disabled for this route.
export const config = {
  api: {
    bodyParser: false,
  },
};

let stripeClient: Stripe | null = null;

function getStripe(): Stripe {
  if (!stripeClient) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error('STRIPE_SECRET_KEY manquant.');
    stripeClient = new Stripe(key);
  }
  return stripeClient;
}

async function getRawBody(req: VercelRequest): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of req as unknown as AsyncIterable<Buffer | string>) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return sendJson(res, 405, { error: 'Method Not Allowed' });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = req.headers['stripe-signature'] as string | undefined;

  if (!webhookSecret || !signature) {
    return sendJson(res, 400, { error: 'Webhook non configuré.' });
  }

  const rawBody = await getRawBody(req);

  let stripeEvent: Stripe.Event;
  try {
    stripeEvent = getStripe().webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err: any) {
    console.error('Stripe webhook signature verification failed:', err.message);
    return sendJson(res, 400, { error: `Signature invalide: ${err.message}` });
  }

  if (stripeEvent.type === 'checkout.session.completed') {
    const session = stripeEvent.data.object as Stripe.Checkout.Session;
    const order = await confirmOrderPaid(session.id);
    if (!order) {
      console.error('Failed to confirm order for Stripe session:', session.id);
      return sendJson(res, 200, { received: true, warning: 'order_not_found_or_update_failed' });
    }
  }

  return sendJson(res, 200, { received: true });
}
