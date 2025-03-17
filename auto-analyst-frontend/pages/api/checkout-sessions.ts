import { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { getSession } from 'next-auth/react';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia',
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { priceId } = req.body;
    
    // Get user session
    const session = await getSession({ req });
    
    if (!session) {
      return res.status(401).json({ error: 'You must be logged in to subscribe' });
    }

    // Create Stripe checkout session
    const checkoutSession = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/pricing`,
      customer_email: session.user?.email || undefined,
      metadata: {
        userId: session.user?.id || 'unknown',
      },
    });

    res.status(200).json({ url: checkoutSession.url });
  } catch (error: any) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({ error: error.message || 'An error occurred with the checkout process' });
  }
} 