import Stripe from 'stripe';
import { createClerkClient } from '@clerk/clerk-sdk-node';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { clerkId } = req.body;

  try {
    // 1. Obtener los metadatos del usuario de Clerk
    const user = await clerkClient.users.getUser(clerkId);
    const stripeCustomerId = user.publicMetadata.stripeCustomerId;

    if (!stripeCustomerId) {
      return res.status(400).json({ error: "No se encontró un ID de cliente vinculado. Por favor, recarga la página." });
    }

    // 2. Crear la sesión de Checkout
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId, // Aquí forzamos a usar el cliente ya creado
      payment_method_types: ['card'],
      line_items: [{
        // REEMPLAZA EL TEXTO DE ABAJO POR TU ID REAL (Ejem: 'price_1Qrs...')
        price: 'price_1SvLP9EqI6UldDzdVz6V9API', 
        quantity: 1,
      }],
      mode: 'subscription',
      success_url: `${req.headers.origin}/app.html`,
      cancel_url: `${req.headers.origin}/index.html`,
      // Permitir que el usuario use sus métodos de pago guardados
      customer_update: {
        address: 'auto',
      },
      metadata: { clerkId } // Clave para que el webhook sepa a quién activar
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error("Error en Checkout:", error);
    res.status(500).json({ error: error.message });
  }
}
