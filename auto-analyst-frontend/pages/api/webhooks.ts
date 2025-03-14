import { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { buffer } from 'micro';
import axios from 'axios';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia',
});

// Disable body parser for webhooks
export const config = {
  api: {
    bodyParser: false,
  },
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).end('Method Not Allowed');
  }

  const buf = await buffer(req);
  const sig = req.headers['stripe-signature'] as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    return res.status(500).json({ error: 'Webhook secret not configured' });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      buf.toString(),
      sig,
      webhookSecret
    );
  } catch (err: any) {
    console.error(`Webhook Error: ${err.message}`);
    return res.status(400).json(`Webhook Error: ${err.message}`);
  }

  // Handle specific events
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        
        if (userId) {
          // Add credits to user account
          await processSubscriptionPurchase(session);
        }
        break;
      }
      
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await updateSubscriptionStatus(subscription);
        break;
      }
    }
    
    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({ error: 'Failed to process webhook' });
  }
}

async function processSubscriptionPurchase(session: Stripe.Checkout.Session) {
  // Get subscription info to determine tier
  if (!session.subscription) return;
  
  const subscription = await stripe.subscriptions.retrieve(
    session.subscription as string
  );
  
  const priceId = subscription.items.data[0].price.id;
  const userId = session.metadata?.userId;
  
  if (!userId) return;
  
  // Map price ID to credit amount - you'll need to customize this based on your tiers
  const creditMapping: Record<string, number> = {
    [process.env.NEXT_PUBLIC_STRIPE_BASIC_PRICE_ID!]: 500,
    [process.env.NEXT_PUBLIC_STRIPE_STANDARD_PRICE_ID!]: 2000,
    [process.env.NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID!]: 5000,
  };
  
  const credits = creditMapping[priceId] || 0;
  
  // Call your backend API to add credits
  try {
    await axios.post(`${API_URL}/users/credits/add`, {
      user_id: userId,
      credits: credits,
      source: 'subscription',
      subscription_id: subscription.id,
    });
    
    console.log(`Added ${credits} credits to user ${userId}`);
  } catch (error) {
    console.error('Failed to add credits:', error);
    throw error;
  }
}

async function updateSubscriptionStatus(subscription: Stripe.Subscription) {
  const userId = subscription.metadata?.userId;
  
  if (!userId) return;
  
  try {
    await axios.post(`${API_URL}/users/subscription/update`, {
      user_id: userId,
      subscription_id: subscription.id,
      status: subscription.status,
      current_period_end: subscription.current_period_end,
    });
    
    console.log(`Updated subscription status for user ${userId}`);
  } catch (error) {
    console.error('Failed to update subscription status:', error);
    throw error;
  }
} 