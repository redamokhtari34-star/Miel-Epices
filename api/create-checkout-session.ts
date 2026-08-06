import type { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';
import { sendJson, applyCors, getSupabaseAdmin } from './_lib/supabaseAdmin.js';

let stripeClient: Stripe | null = null;

function getStripe(): Stripe {
  if (!stripeClient) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (
      !key ||
      typeof key !== 'string' ||
      key.includes('MY_STRIPE') ||
      key.includes('placeholder') ||
      key.trim() === '' ||
      (!key.startsWith('sk_test_') && !key.startsWith('sk_live_') && !key.startsWith('rk_test_') && !key.startsWith('rk_live_'))
    ) {
      throw new Error("STRIPE_SECRET_KEY_MISSING");
    }
    stripeClient = new Stripe(key);
  }
  return stripeClient;
}

function generateOrderId(): string {
  const year = new Date().getFullYear();
  const suffix = Date.now().toString(36).toUpperCase().slice(-6);
  return `ME-${year}-${suffix}`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    applyCors(res);
    res.status(200).end();
    return;
  }
  if (req.method !== 'POST') {
    return sendJson(res, 405, { error: 'Method Not Allowed' });
  }

  try {
    const body = req.body || {};
    const { items, shippingInfo } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return sendJson(res, 400, { error: 'Votre panier est vide.' });
    }

    for (const item of items) {
      const unitPrice = item.product.price * item.weightOption.multiplier;
      if (unitPrice <= 0) {
        return sendJson(res, 400, {
          error: `Le produit "${item.product.name}" n'a pas encore de prix défini par l'artisan (0 €). Veuillez lui attribuer un prix dans l'Espace Artisan avant de procéder à l'achat.`,
        });
      }
    }

    let stripe;
    try {
      stripe = getStripe();
    } catch {
      return sendJson(res, 400, {
        error: "La clé Stripe (STRIPE_SECRET_KEY) n'est pas configurée sur le serveur. Veuillez ajouter une clé API Stripe valide dans les variables d'environnement.",
        isConfigError: true,
      });
    }

    const originHeader = (req.headers.origin as string) || 'http://localhost:3000';

    const line_items = items.map((item: any) => {
      const unitPrice = item.product.price * item.weightOption.multiplier;
      const amountInCents = Math.round(unitPrice * 100);

      const imageUrl = item.product.image;
      const formattedImages = imageUrl
        ? [imageUrl.startsWith('http') ? imageUrl : `${process.env.APP_URL || originHeader}${imageUrl}`]
        : [];

      const productData: Record<string, unknown> = {
        name: `${item.product.name} - ${item.weightOption.label}`,
        images: formattedImages,
      };
      if (item.product.description && String(item.product.description).trim()) {
        productData.description = String(item.product.description).trim();
      }

      return {
        price_data: {
          currency: 'eur',
          product_data: productData,
          unit_amount: amountInCents,
        },
        quantity: item.quantity,
      };
    });

    const origin = originHeader;
    const orderId = generateOrderId();
    const total = items.reduce(
      (sum: number, item: any) => sum + item.product.price * item.weightOption.multiplier * item.quantity,
      0
    );

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items,
      mode: 'payment',
      customer_email: shippingInfo?.email || undefined,
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/cancel`,
      metadata: {
        order_id: orderId,
        shipping_name: shippingInfo?.name || '',
        shipping_phone: shippingInfo?.phone || '',
        shipping_address: shippingInfo?.address || '',
        shipping_city: shippingInfo?.city || '',
      },
    });

    // Record the order as "awaiting_payment" so the Stripe webhook can confirm it
    // once payment actually succeeds — nothing here is trusted as a completed sale.
    try {
      const supabase = getSupabaseAdmin();
      const { error: insertError } = await supabase.from('me_orders').insert({
        id: orderId,
        customer_name: shippingInfo?.name || '',
        email: shippingInfo?.email || '',
        address: `${shippingInfo?.address || ''}, ${shippingInfo?.city || ''}`,
        phone: shippingInfo?.phone || '',
        items: items.map((item: any) => ({
          product_id: item.product.id,
          name: item.product.name,
          quantity: item.quantity,
          weight: item.weightOption.weight,
        })),
        total,
        status: 'awaiting_payment',
        stripe_session_id: session.id,
      });
      if (insertError) {
        console.error('Supabase rejected the order insert:', insertError.message, insertError.details);
      }
    } catch (dbErr) {
      console.error('Failed to pre-record order in Supabase:', dbErr);
    }

    return sendJson(res, 200, { url: session.url });
  } catch (error: any) {
    const isStripeConfigError =
      error?.name === 'StripeConnectionError' ||
      error?.type === 'StripeConnectionError' ||
      error?.type === 'StripeAuthenticationError' ||
      error?.name === 'StripeAuthenticationError' ||
      error?.message?.includes('connection to Stripe') ||
      error?.message?.includes('API key') ||
      error?.message?.includes('STRIPE_SECRET_KEY');

    if (isStripeConfigError) {
      console.warn("Notice: Stripe key inactive or connection unavailable:", error?.message || error);
      return sendJson(res, 400, {
        error: "La clé API Stripe (STRIPE_SECRET_KEY) est absente, invalide ou non connectée. Vous pouvez finaliser votre commande en Mode Démo.",
        isConfigError: true,
      });
    }

    console.error('Stripe Checkout Error:', error?.message || error);
    return sendJson(res, 500, {
      error: error.message || "Une erreur est survenue lors de l'initiation du paiement.",
    });
  }
}
