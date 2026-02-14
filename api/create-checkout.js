import Stripe from 'stripe';
import { createClerkClient } from '@clerk/clerk-sdk-node';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { clerkId } = req.body;

  try {
    const user = await clerkClient.users.getUser(clerkId);
    const stripeCustomerId = user.publicMetadata.stripeCustomerId;

    if (!stripeCustomerId) {
      return res.status(400).json({ error: "No se encontró un ID de cliente vinculado." });
    }

    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId, 
      automatic_payment_methods,
      line_items: [{
        price: 'price_1T0sB4EqI6UldDzdCFpjGaO0', // Reemplaza con tu price_...
        quantity: 1,
      }],
      mode: 'subscription',
      // Esto obliga a Stripe a pedir la tarjeta aunque el total inicial sea $0
      payment_method_collection: 'always', 
      success_url: `${req.headers.origin}/app.html`,
      cancel_url: `${req.headers.origin}/index.html`,
      metadata: { clerkId }
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error("Error en Checkout:", error);
    res.status(500).json({ error: error.message });
  }
}
