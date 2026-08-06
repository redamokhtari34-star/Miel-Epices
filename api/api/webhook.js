import Stripe from 'stripe';
import { buffer } from 'micro'; // Si tu utilises Next.js/Node

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const config = {
  api: {
    bodyParser: false, // Indispensable pour Stripe
  },
};

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const buf = await buffer(req);
    const sig = req.headers['stripe-signature'];

    let event;

    try {
      event = stripe.webhooks.constructEvent(buf, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
      console.log(`❌ Erreur de signature: ${err.message}`);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      console.log("✅ Paiement validé !", session.id);
      // ICI : tu peux ajouter ta logique (envoyer mail, mettre à jour base de données)
    }

    res.json({ received: true });
  } else {
    res.status(405).end('Method Not Allowed');
  }
}
