import { createClerkClient } from '@clerk/clerk-sdk-node';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { data, type } = req.body;

  if (type === 'user.created') {
    const clerkId = data.id;
    const email = data.email_addresses[0].email_address;

    // 1. Crear cliente en Stripe
    const customer = await stripe.customers.create({
      email: email,
      metadata: { clerkId: clerkId }
    });

    // 2. Guardar Stripe ID en los metadatos de Clerk
    await clerkClient.users.updateUserMetadata(clerkId, {
      publicMetadata: {
        stripeCustomerId: customer.id,
        status: 'pending'
      }
    });

    console.log(`Usuario ${clerkId} vinculado a Stripe ${customer.id}`);
  }

  res.json({ received: true });
}
