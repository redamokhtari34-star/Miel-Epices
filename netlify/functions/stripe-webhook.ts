import { Handler } from "@netlify/functions";
import Stripe from "stripe";
import { getSupabaseAdmin, jsonResponse } from "./_shared/supabaseAdmin";
import { sendEmail } from "./_shared/email";

// Touched again: switched Stripe account (checkout + webhook were on two
// different Stripe accounts) — forcing a rebuild to pick up the new keys.

let stripeClient: Stripe | null = null;

function getStripe(): Stripe {
  if (!stripeClient) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY manquant.");
    stripeClient = new Stripe(key);
  }
  return stripeClient;
}

export const handler: Handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return jsonResponse(405, { error: "Method Not Allowed" });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = event.headers["stripe-signature"];

  if (!webhookSecret || !signature) {
    return jsonResponse(400, { error: "Webhook non configuré." });
  }

  const rawBody = event.isBase64Encoded ? Buffer.from(event.body || "", "base64") : event.body || "";

  let stripeEvent: Stripe.Event;
  try {
    stripeEvent = getStripe().webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err: any) {
    console.error("Stripe webhook signature verification failed:", err.message);
    return jsonResponse(400, { error: `Signature invalide: ${err.message}` });
  }

  const supabase = getSupabaseAdmin();

  if (stripeEvent.type === "checkout.session.completed") {
    const session = stripeEvent.data.object as Stripe.Checkout.Session;

    const { data: order, error: fetchError } = await supabase
      .from("me_orders")
      .select("*")
      .eq("stripe_session_id", session.id)
      .single();

    if (fetchError || !order) {
      console.error("Order not found for Stripe session:", session.id, fetchError?.message);
      return jsonResponse(200, { received: true, warning: "order_not_found" });
    }

    // Idempotency: a webhook can be delivered more than once.
    if (order.status !== "awaiting_payment") {
      return jsonResponse(200, { received: true });
    }

    const { error: updateError } = await supabase
      .from("me_orders")
      .update({ status: "pending" })
      .eq("id", order.id);

    if (updateError) {
      console.error("Failed to mark order as paid:", updateError.message);
      return jsonResponse(500, { error: updateError.message });
    }

    // Deduct stock server-side, now that payment is actually confirmed.
    const items = (order.items as { product_id: string; quantity: number }[]) || [];
    for (const item of items) {
      if (!item.product_id) continue;
      const { data: product } = await supabase
        .from("me_products")
        .select("stock")
        .eq("id", item.product_id)
        .single();
      if (product) {
        await supabase
          .from("me_products")
          .update({ stock: Math.max(0, product.stock - item.quantity) })
          .eq("id", item.product_id);
      }
    }

    const itemsList = items.map((it: any) => `<li>${it.quantity} x ${it.name} (${it.weight})</li>`).join("");
    if (order.email) {
      await sendEmail({
        to: order.email,
        subject: `Confirmation de votre commande ${order.id} — Miel et Épices`,
        html: `
          <h2>Merci pour votre commande, ${order.customer_name || ""} !</h2>
          <p>Votre paiement a bien été reçu. Voici le récapitulatif :</p>
          <ul>${itemsList}</ul>
          <p><strong>Total : ${Number(order.total).toFixed(2)} €</strong></p>
          <p>Numéro de commande : ${order.id}</p>
          <p>Nos artisans-pâtissiers préparent votre commande.</p>
        `,
      });
    }

    const notifyEmail = process.env.SHOP_NOTIFICATION_EMAIL;
    if (notifyEmail) {
      await sendEmail({
        to: notifyEmail,
        subject: `Nouvelle commande payée : ${order.id}`,
        html: `
          <h2>Nouvelle commande ${order.id}</h2>
          <p>Client : ${order.customer_name} (${order.email})</p>
          <p>Adresse : ${order.address}</p>
          <p>Téléphone : ${order.phone}</p>
          <ul>${itemsList}</ul>
          <p><strong>Total : ${Number(order.total).toFixed(2)} €</strong></p>
        `,
      });
    }
  }

  return jsonResponse(200, { received: true });
};
