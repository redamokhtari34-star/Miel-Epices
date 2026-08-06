import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import Stripe from "stripe";
import dotenv from "dotenv";

dotenv.config();

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

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Stripe Webhook handler for signature verification and event handling
  const handleStripeWebhook = async (req: express.Request, res: express.Response) => {
    const sig = req.headers["stripe-signature"] as string;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event: Stripe.Event;

    try {
      let stripe: Stripe | null = null;
      try {
        stripe = getStripe();
      } catch {
        // Stripe client unconfigured
      }

      if (stripe && webhookSecret && sig) {
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
      } else {
        const bodyStr = typeof req.body === "string" ? req.body : req.body.toString("utf8");
        event = JSON.parse(bodyStr);
      }
    } catch (err: any) {
      console.error(`⚠️ Erreur Webhook Stripe:`, err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle checkout.session.completed
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      console.log(`✅ Paiement validé via Stripe ! Session ID: ${session.id}`);
      console.log(`Client: ${session.customer_details?.email || session.customer_email || "Inconnu"}`);
      console.log(`Montant: ${session.amount_total ? session.amount_total / 100 : 0} €`);
      console.log(`Infos de livraison (metadata):`, session.metadata);
    }

    res.json({ received: true });
  };

  // Mount raw body routes for Stripe Webhooks before standard json middleware
  app.post("/api/webhook", express.raw({ type: "application/json" }), handleStripeWebhook);
  app.post("/webhook", express.raw({ type: "application/json" }), handleStripeWebhook);

  app.use(express.json());

  // API route to create a Stripe Checkout Session
  app.post("/api/create-checkout-session", async (req, res) => {
    try {
      const { items, shippingInfo } = req.body;

      if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: "Votre panier est vide." });
      }

      // Check if any product has zero price
      for (const item of items) {
        const unitPrice = item.product.price * item.weightOption.multiplier;
        if (unitPrice <= 0) {
          return res.status(400).json({
            error: `Le produit "${item.product.name}" n'a pas encore de prix défini par l'artisan (0 €). Veuillez lui attribuer un prix dans l'Espace Artisan avant de procéder à l'achat.`
          });
        }
      }

      let stripe;
      try {
        stripe = getStripe();
      } catch {
        return res.status(400).json({
          error: "La clé Stripe (STRIPE_SECRET_KEY) n'est pas configurée sur le serveur. Veuillez ajouter une clé API Stripe valide dans les variables d'environnement.",
          isConfigError: true
        });
      }

      // Format line items for Stripe Checkout
      const line_items = items.map((item: any) => {
        const unitPrice = item.product.price * item.weightOption.multiplier;
        const amountInCents = Math.round(unitPrice * 100);

        // Build absolute image URL if possible
        const imageUrl = item.product.image;
        const formattedImages = imageUrl
          ? [imageUrl.startsWith("http") ? imageUrl : `${process.env.APP_URL || req.headers.origin || "http://localhost:3000"}${imageUrl}`]
          : [];

        return {
          price_data: {
            currency: "eur",
            product_data: {
              name: `${item.product.name} - ${item.weightOption.label}`,
              description: item.product.description || "",
              images: formattedImages,
            },
            unit_amount: amountInCents,
          },
          quantity: item.quantity,
        };
      });

      const origin = req.headers.origin || "http://localhost:3000";

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items,
        mode: "payment",
        customer_email: shippingInfo?.email || undefined,
        success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/cancel`,
        metadata: {
          shipping_name: shippingInfo?.name || "",
          shipping_phone: shippingInfo?.phone || "",
          shipping_address: shippingInfo?.address || "",
          shipping_city: shippingInfo?.city || "",
        },
      });

      res.json({ url: session.url });
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
        return res.status(400).json({
          error: "La clé API Stripe (STRIPE_SECRET_KEY) est absente, invalide ou non connectée. Vous pouvez finaliser votre commande en Mode Démo.",
          isConfigError: true,
        });
      }

      console.error("Stripe Checkout Error:", error?.message || error);
      res.status(500).json({
        error: error.message || "Une erreur est survenue lors de l'initiation du paiement."
      });
    }
  });

  // Admin Login route
  const handleAdminLoginRoute = (req: express.Request, res: express.Response) => {
    const { password } = req.body || {};
    const expectedPassword = process.env.ADMIN_PASSWORD || 'sidimabrouk2500';

    if (password === expectedPassword) {
      return res.json({ token: `artisan_session_${Date.now()}_${Math.random().toString(36).substring(2)}` });
    }
    return res.status(401).json({ error: "Code d'accès incorrect." });
  };

  app.post("/api/admin-login", handleAdminLoginRoute);
  app.post("/.netlify/functions/admin-login", handleAdminLoginRoute);

  // Health check route
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Vite integration
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
