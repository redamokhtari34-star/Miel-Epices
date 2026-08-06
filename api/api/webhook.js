import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const config = {
  api: {
    bodyParser: false,
  },
};

// Fonction pour récupérer les données brutes sans package externe
async function getRawBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).end('Method Not Allowed');
  }

  try {
    const buf = await getRawBody(req);
    const sig = req.headers['stripe-signature'];

    const event = stripe.webhooks.constructEvent(
      buf,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      console.log('✅ Paiement validé pour la session :', session.id);
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    console.error(`❌ Erreur Webhook : ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
}
