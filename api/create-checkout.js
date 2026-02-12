import Stripe from 'stripe';
import { createClerkClient } from '@clerk/clerk-sdk-node';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { clerkId } = req.body;

  // 1. Obtener el usuario de Clerk para sacar su stripeCustomerId
  const user = await clerkClient.users.getUser(clerkId);
  const stripeCustomerId = user.publicMetadata.stripeCustomerId;

  if (!stripeCustomerId) {
    return res.status(400).json({ error: "El usuario no tiene un ID de Stripe vinculado." });
  }

  try {
    // 2. Crear la sesión de Checkout forzando el cliente existente
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId, // AQUÍ SE FUERZA LA UNICIDAD
      payment_method_types: ['card'],
      line_items: [{
        price: 'ID_DE_TU_PRECIO_EN_STRIPE', // Debes poner el ID de precio (price_...)
        quantity: 1,
      }],
      mode: 'subscription',
      success_url: `${req.headers.origin}/app.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.origin}/index.html`,
      metadata: { clerkId } // Para que el webhook sepa a quién activar
    });

    res.json({ url: session.url });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
