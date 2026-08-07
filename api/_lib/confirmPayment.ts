import { getSupabaseAdmin } from './supabaseAdmin.js';
import { sendEmail } from './email.js';

// Marks an order as paid, deducts stock, and sends confirmation emails.
// Idempotent: safe to call multiple times for the same order (e.g. once
// from the Stripe webhook and once from a client-side poll that noticed
// the payment before the webhook arrived) — only the first call that finds
// the order still 'awaiting_payment' does any work.
export async function confirmOrderPaid(sessionId: string) {
  const supabase = getSupabaseAdmin();
  const { data: order, error: fetchError } = await supabase
    .from('me_orders')
    .select('*')
    .eq('stripe_session_id', sessionId)
    .single();

  if (fetchError || !order) return null;
  if (order.status !== 'awaiting_payment') return order;

  const { data: updated, error: updateError } = await supabase
    .from('me_orders')
    .update({ status: 'pending' })
    .eq('id', order.id)
    .select()
    .single();

  if (updateError || !updated) return null;

  const items = (order.items as { product_id: string; quantity: number; name: string; weight: string }[]) || [];
  for (const item of items) {
    if (!item.product_id) continue;
    const { data: product } = await supabase
      .from('me_products')
      .select('stock')
      .eq('id', item.product_id)
      .single();
    if (product) {
      await supabase
        .from('me_products')
        .update({ stock: Math.max(0, product.stock - item.quantity) })
        .eq('id', item.product_id);
    }
  }

  const itemsList = items.map((it) => `<li>${it.quantity} x ${it.name} (${it.weight})</li>`).join('');
  if (order.email) {
    await sendEmail({
      to: order.email,
      subject: `Confirmation de votre commande ${order.id} — Miel et Épices`,
      html: `
        <h2>Merci pour votre commande, ${order.customer_name || ''} !</h2>
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

  return updated;
}
