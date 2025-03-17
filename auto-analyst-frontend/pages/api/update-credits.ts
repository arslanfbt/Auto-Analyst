import { NextApiRequest, NextApiResponse } from 'next'
import { getToken } from 'next-auth/jwt'
import redis, { creditUtils, KEYS } from '@/lib/redis'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24.acacia',
})

// Credit amounts based on plan level
const PLAN_CREDITS = {
  'Free Plan': 100,
  'Standard Plan': 5000,
  'Pro Plan': 999999, // Effectively unlimited
  'Starter Plan': 1000,
  'Business Plan': 15000,
  // Add other plans as needed
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { session_id } = req.body

    if (!session_id) {
      return res.status(400).json({ error: 'Session ID required' })
    }

    // Get the user token
    const token = await getToken({ req })
    if (!token?.sub) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const userId = token.sub

    // Test Redis connection
    try {
      await redis.ping();
      console.log('✅ Redis connection successful in update-credits');
    } catch (error) {
      console.error('⚠️ Redis connection failed in update-credits:', error);
      return res.status(500).json({ error: 'Redis connection failed' });
    }

    // Retrieve checkout session to get plan details
    const session = await stripe.checkout.sessions.retrieve(session_id, {
      expand: ['line_items', 'line_items.data.price.product'],
    })

    // Get the product details
    const lineItem = session.line_items?.data[0]
    if (!lineItem) {
      return res.status(404).json({ error: 'Product information not found' })
    }

    const product = lineItem.price?.product as Stripe.Product
    const planName = product.name
    
    // Get price details for interval information
    const price = lineItem.price
    const interval = price?.recurring?.interval || 'month'
    const amount = price?.unit_amount ? price.unit_amount / 100 : 0

    // Calculate next renewal date
    const now = new Date()
    let renewalDate = new Date()
    if (interval === 'month') {
      renewalDate.setMonth(now.getMonth() + 1)
    } else if (interval === 'year') {
      renewalDate.setFullYear(now.getFullYear() + 1)
    }

    console.log(`Updating user subscription: ${userId} to plan ${planName}`);

    // Calculate the reset date based on the billing interval
    const resetDate = interval === 'month' 
      ? creditUtils.getNextMonthFirstDay()
      : creditUtils.getNextYearFirstDay();

    // Determine credits to add based on plan
    const creditsToAdd = PLAN_CREDITS[planName as keyof typeof PLAN_CREDITS] || 1000;
    
    console.log(`Setting ${creditsToAdd} credits for user ${userId} based on plan ${planName}`);
    
    try {
      // Update user subscription using the new hash-based approach
      await redis.hset(KEYS.USER_SUBSCRIPTION(userId), {
        plan: planName,
        status: 'active',
        amount: amount.toString(),
        interval: interval,
        renewalDate: renewalDate.toISOString().split('T')[0],
        lastUpdated: new Date().toISOString()
      });
      
      // Update user credits using the new hash-based approach
      await redis.hset(KEYS.USER_CREDITS(userId), {
        total: creditsToAdd.toString(),
        used: '0',
        resetDate: resetDate,
        lastUpdate: new Date().toISOString()
      });
      
      // For backward compatibility, also update individual keys
      // This can be removed once the migration is complete
      await redis.set(`${KEYS.LEGACY_PREFIX}${userId}:planName`, planName);
      await redis.set(`${KEYS.LEGACY_PREFIX}${userId}:planStatus`, 'active');
      await redis.set(`${KEYS.LEGACY_PREFIX}${userId}:planAmount`, amount.toString());
      await redis.set(`${KEYS.LEGACY_PREFIX}${userId}:planInterval`, interval);
      await redis.set(`${KEYS.LEGACY_PREFIX}${userId}:planRenewalDate`, renewalDate.toISOString().split('T')[0]);
      await redis.set(`${KEYS.LEGACY_PREFIX}${userId}:creditsTotal`, creditsToAdd.toString());
      await redis.set(`${KEYS.LEGACY_PREFIX}${userId}:creditsUsed`, '0');
      await redis.set(`${KEYS.LEGACY_PREFIX}${userId}:creditsLastUpdate`, new Date().toISOString());
      await redis.set(`${KEYS.LEGACY_PREFIX}${userId}:creditsResetDate`, resetDate);
      
      // Also keep the legacy format
      await redis.set(KEYS.LEGACY_CREDITS(userId), creditsToAdd);
      
      console.log(`Successfully updated all Redis values for user ${userId}`);
    } catch (error) {
      console.error('Error updating Redis values:', error);
      return res.status(500).json({ error: 'Failed to update subscription in database' });
    }
    
    // Return updated credits
    return res.status(200).json({ 
      success: true,
      credits: creditsToAdd,
      used: 0,
      plan: planName,
      renewalDate: renewalDate.toISOString().split('T')[0],
      resetDate: resetDate
    })
  } catch (error: any) {
    console.error('Error updating credits:', error)
    return res.status(500).json({ error: error.message || 'Failed to update credits' })
  }
} 