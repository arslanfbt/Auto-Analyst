import Stripe from 'stripe';

// Initialize Stripe only if the secret key exists
const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-02-24.acacia',
    })
  : null;

/**
 * Checks if a subscription is active and in good standing with Stripe
 */
export async function isStripeSubscriptionActive(subscriptionId: string): Promise<boolean> {
  try {
    if (!stripe) {
      console.error('Stripe is not initialized - missing API key');
      return false;
    }

    if (!subscriptionId) {
      console.error('No subscription ID provided');
      return false;
    }

    // Retrieve the subscription from Stripe
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    
    // Check if subscription is active (valid statuses: active, trialing)
    const isActive = ['active', 'trialing'].includes(subscription.status);
    
    // Check if there are any issues with the subscription payment
    const currentPeriodEnd = new Date(subscription.current_period_end * 1000);
    const now = new Date();
    
    // If the current period has ended but status is still active,
    // it means the payment is being processed or has failed
    const gracePeriodDays = 3; // Give 3 days grace period for payment processing
    const gracePeriodEnd = new Date(currentPeriodEnd);
    gracePeriodEnd.setDate(gracePeriodEnd.getDate() + gracePeriodDays);
    
    // If we're past the grace period and status is still active, something is wrong
    if (now > gracePeriodEnd && subscription.status === 'active') {
      console.warn(`Subscription ${subscriptionId} is past grace period but still active. Possible payment issue.`);
      return false;
    }
    
    return isActive;
  } catch (error) {
    console.error(`Error checking Stripe subscription status for ${subscriptionId}:`, error);
    return false;
  }
}

/**
 * Retrieves current subscription period information from Stripe
 */
export async function getSubscriptionPeriod(subscriptionId: string): Promise<{
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  status: string;
} | null> {
  try {
    if (!stripe) {
      console.error('Stripe is not initialized - missing API key');
      return null;
    }

    if (!subscriptionId) {
      console.error('No subscription ID provided');
      return null;
    }

    // Retrieve the subscription from Stripe
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    
    return {
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      status: subscription.status
    };
  } catch (error) {
    console.error(`Error getting subscription period for ${subscriptionId}:`, error);
    return null;
  }
} 