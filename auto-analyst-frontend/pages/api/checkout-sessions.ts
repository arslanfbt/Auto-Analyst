import { NextApiRequest, NextApiResponse } from 'next';
import { getToken } from 'next-auth/jwt';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia',
});

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ errorj: 'Method not allowed' });
  }

  try {
    // Get user from session
    const token = await getToken({ req });
    if (!token) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { priceId, userId } = req.body;

    // Create Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${req.headers.origin}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.origin}/pricing`,
      metadata: {
        userId: userId || token.email,
      },
      subscription_data: {
        metadata: {
          userId: userId || token.email,
        },
      },
    });

    res.status(200).json({ sessionId: session.id });
  } catch (error: any) {
    console.error('Error creating checkout session:', error);
    res.status(500).json({
      error: {
        message: error.message || 'An error occurred with the payment system',
      },
    });
  }
} 