import { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { buffer } from 'micro';
import redis, { creditUtils, KEYS } from '@/lib/redis';

// Disable the default body parser to access the raw request body
export const config = {
  api: {
    bodyParser: false,
  },
};

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

// Helper function to update a user's subscription information
async function updateUserSubscription(userId: string, session: Stripe.Checkout.Session) {
  try {
    // Retrieve the complete line items to get product details
    const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
    if (!lineItems.data.length) return;

    // Get the price ID from the line item
    const priceId = lineItems.data[0].price?.id;
    if (!priceId) return;

    // Retrieve price to get recurring interval and product ID
    const price = await stripe.prices.retrieve(priceId);
    
    // Retrieve product details
    const product = await stripe.products.retrieve(price.product as string);

    // Extract subscription details
    const planName = product.name;
    const interval = price.recurring?.interval || 'month';
    const amount = price.unit_amount! / 100; // Convert from cents to dollars
    
    // Calculate next renewal date
    const now = new Date();
    let renewalDate = new Date();
    if (interval === 'month') {
      renewalDate.setMonth(now.getMonth() + 1);
    } else if (interval === 'year') {
      renewalDate.setFullYear(now.getFullYear() + 1);
    }
    
    // Determine credits to assign based on plan
    let newCreditTotal = 500; // Standard default
    if (planName.toUpperCase().includes('PRO')) {
      newCreditTotal = 999999; // "Unlimited" for Pro plan
    } else if (planName.toUpperCase().includes('STANDARD')) {
      newCreditTotal = 500; // Standard plan credits
    } else if (planName.toUpperCase().includes('FREE')) {
      newCreditTotal = 100; // Free plan credits
    }
    
    // Get reset date
    const resetDate = interval === 'month' 
      ? creditUtils.getNextMonthFirstDay()
      : creditUtils.getNextYearFirstDay();
    
    // Save purchase date for renewal calculations
    const purchaseDate = now.toISOString();
    
    // Update user subscription using the hash-based approach
    await redis.hset(KEYS.USER_SUBSCRIPTION(userId), {
      plan: planName,
      status: 'active',
      amount: amount.toString(),
      interval: interval,
      purchaseDate: purchaseDate,
      renewalDate: renewalDate.toISOString().split('T')[0],
      lastUpdated: now.toISOString(),
      stripeCustomerId: session.customer, 
      stripeSubscriptionId: session.subscription
    });
    
    // Update user credits using the hash-based approach
    await redis.hset(KEYS.USER_CREDITS(userId), {
      total: newCreditTotal.toString(),
      used: '0',
      resetDate: resetDate,
      lastUpdate: now.toISOString()
    });
    
    return true;
  } catch (error) {
    console.error('Error updating user subscription:', error);
    return false;
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const rawBody = await buffer(req);
    const signature = req.headers['stripe-signature'] as string;

    if (!signature) {
      return res.status(400).json({ error: 'Missing Stripe signature' });
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(
        rawBody.toString(),
        signature,
        webhookSecret
      );
    } catch (err: any) {
      console.error(`Webhook signature verification failed: ${err.message}`);
      return res.status(400).json({ error: err.message });
    }

    console.log(`Processing Stripe webhook event: ${event.type}`);

    // Handle the event based on its type
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        
        // Extract the user ID from metadata
        const userId = session.metadata?.userId;

        if (!userId) {
          console.error('No user ID found in session metadata');
          return res.status(400).json({ error: 'No user ID found' });
        }

        // Update the user's subscription
        const success = await updateUserSubscription(userId, session);
        
        if (success) {
          console.log(`Successfully processed checkout for user ${userId}`);
        } else {
          console.error(`Failed to process checkout for user ${userId}`);
        }
        break;
      }
        
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        // Handle subscription update logic
        console.log('Subscription updated event received, but not fully implemented');
        break;
      }
        
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        // Handle subscription cancellation/deletion
        console.log('Subscription deleted event received, but not fully implemented');
        break;
      }
        
      // Add more event types as needed
      
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return res.status(200).json({ received: true });
  } catch (error: any) {
    console.error('Webhook error:', error);
    return res.status(500).json({ error: error.message || 'Webhook handler failed' });
  }
} 