import { Redis } from '@upstash/redis'

// Initialize Redis client with Upstash credentials
const redis = new Redis({
  url: process.env.NEXT_PUBLIC_UPSTASH_REDIS_REST_URL || '',
  token: process.env.NEXT_PUBLIC_UPSTASH_REDIS_REST_TOKEN || '',
})

// Test connection and log status
const testConnection = async () => {
  try {
    await redis.ping();
    console.log('✅ Redis connection successful');
    return true;
  } catch (error) {
    console.error('⚠️ Redis connection failed:', error);
    return false;
  }
};

// Run connection test when module is imported
testConnection();

export default redis

// Consolidated hash-based key schema - ONLY use these keys
export const KEYS = {
  USER_PROFILE: (userId: string) => `user:${userId}:profile`,
  USER_SUBSCRIPTION: (userId: string) => `user:${userId}:subscription`,
  USER_CREDITS: (userId: string) => `user:${userId}:credits`,
};

// Credits management utilities with consolidated hash-based storage
export const creditUtils = {
  // Get user's remaining credits
  async getRemainingCredits(userId: string): Promise<number> {
    try {
      // Only use hash-based storage
      const creditsHash = await redis.hgetall<{
        total?: string;
        used?: string;
      }>(KEYS.USER_CREDITS(userId));
      
      if (creditsHash && creditsHash.total) {
        const total = parseInt(creditsHash.total);
        const used = creditsHash.used ? parseInt(creditsHash.used) : 0;
        return total - used;
      }
      
      // Default for new users
      return 100;
    } catch (error) {
      console.error('Error fetching credits:', error);
      return 100; // Failsafe
    }
  },

  // Set initial credits for a user
  async initializeCredits(userId: string, credits: number = parseInt(process.env.NEXT_PUBLIC_CREDITS_INITIAL_AMOUNT || '100')): Promise<void> {
    try {
      // Only use hash-based approach
      await redis.hset(KEYS.USER_CREDITS(userId), {
        total: credits.toString(),
        used: '0',
        lastUpdate: new Date().toISOString(),
        resetDate: this.getNextMonthFirstDay()
      });
      
      console.log(`Credits initialized successfully for ${userId}: ${credits}`);
    } catch (error) {
      console.error('Error initializing credits:', error);
    }
  },

  // Deduct credits when a user makes an API call
  async deductCredits(userId: string, amount: number): Promise<boolean> {
    try {
      // Only use hash-based approach
      const creditsHash = await redis.hgetall<{
        total?: string;
        used?: string;
      }>(KEYS.USER_CREDITS(userId));
      
      if (creditsHash && creditsHash.total) {
        const total = parseInt(creditsHash.total);
        const used = creditsHash.used ? parseInt(creditsHash.used) : 0;
        const remaining = total - used;
        
        // Check if user has enough credits
        if (remaining < amount) {
          return false;
        }
        
        // Update used credits in hash
        const newUsed = used + amount;
        await redis.hset(KEYS.USER_CREDITS(userId), {
          used: newUsed.toString(),
          lastUpdate: new Date().toISOString()
        });
        
        return true;
      }
      
      // Initialize credits if not found
      await this.initializeCredits(userId);
      
      // Check if we have enough of the initial credits
      return amount <= 100;
    } catch (error) {
      console.error('Error deducting credits:', error);
      return true; // Failsafe
    }
  },

  // Check if a user has enough credits
  async hasEnoughCredits(userId: string, amount: number): Promise<boolean> {
    const remainingCredits = await this.getRemainingCredits(userId);
    return remainingCredits >= amount;
  },
  
  // Helper to get the first day of next month
  getNextMonthFirstDay(): string {
    const today = new Date();
    const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    return nextMonth.toISOString().split('T')[0];
  },
  
  // Helper to get the first day of next year
  getNextYearFirstDay(): string {
    const today = new Date();
    const nextYear = new Date(today.getFullYear() + 1, 0, 1);
    return nextYear.toISOString().split('T')[0];
  },
  
  // Reset user credits based on their plan
  async resetUserCredits(userId: string): Promise<boolean> {
    try {
      // Get subscription to determine plan
      const sub = await redis.hgetall(KEYS.USER_SUBSCRIPTION(userId));
      
      if (!sub || !sub.plan) {
        // No subscription found, fallback to basic
        return false;
      }
      
      // Determine credit amount based on plan
      let creditAmount = 100; // Default
      if ((sub.plan as string).includes('Pro')) {
        creditAmount = 999999;
      } else if ((sub.plan as string).includes('Standard')) {
        creditAmount = 500;
      } else if ((sub.plan as string).includes('Basic')) {
        creditAmount = 100;
      }
      
      // Update credits hash
      await redis.hset(KEYS.USER_CREDITS(userId), {
        total: creditAmount.toString(),
        used: '0',
        lastUpdate: new Date().toISOString(),
        resetDate: sub.interval === 'year' ? this.getNextYearFirstDay() : this.getNextMonthFirstDay()
      });
      
      return true;
    } catch (error) {
      console.error('Error resetting user credits:', error);
      return false;
    }
  }
};

// Subscription utilities for efficiently accessing user plan data
export const subscriptionUtils = {
  // Get complete user subscription data efficiently
  async getUserSubscriptionData(userId: string): Promise<{
    plan: string;
    credits: {
      used: number;
      total: number | 'Unlimited';
      remaining: number | 'Unlimited';
    };
    isPro: boolean;
  }> {
    try {
      // Get subscription and credits from hash
      const subData = await redis.hgetall(KEYS.USER_SUBSCRIPTION(userId));
      const creditsData = await redis.hgetall(KEYS.USER_CREDITS(userId));
      
      // Default values if no data found
      let plan = 'Free';
      let isPro = false;
      let creditsTotal = 100;
      let creditsUsed = 0;
      
      // Parse subscription data if found
      if (subData && subData.plan) {
        plan = subData.plan as string;
        isPro = plan.toUpperCase().includes('PRO');
      }
      
      // Parse credits data if found
      if (creditsData) {
        creditsTotal = parseInt(creditsData.total as string || '100');
        creditsUsed = parseInt(creditsData.used as string || '0');
      } 
      
      // Format the response with the right types for unlimited credits
      const isUnlimited = isPro || creditsTotal >= 999999;
      const formattedTotal = isUnlimited ? 'Unlimited' : creditsTotal;
      const remaining = isUnlimited ? 'Unlimited' : Math.max(0, creditsTotal - creditsUsed);
      
      return {
        plan,
        credits: {
          used: creditsUsed,
          total: formattedTotal,
          remaining
        },
        isPro
      };
    } catch (error) {
      console.error('Error getting user subscription data:', error);
      // Return fallback defaults if there's an error
      return {
        plan: 'Free',
        credits: {
          used: 0,
          total: 100, 
          remaining: 100
        },
        isPro: false
      };
    }
  },
  
  // Check if a user has an active subscription
  async isSubscriptionActive(userId: string): Promise<boolean> {
    try {
      const subscriptionData = await redis.hgetall(KEYS.USER_SUBSCRIPTION(userId));
      if (!subscriptionData || !subscriptionData.status) {
        return false;
      }
      
      // Check if subscription is active and not expired
      if (subscriptionData.status === 'active') {
        // Check if subscription has expired
        if (subscriptionData.renewalDate) {
          const renewalDate = new Date(subscriptionData.renewalDate as string);
          const now = new Date();
          if (renewalDate < now) {
            // Subscription has expired, downgrade to free plan
            console.log(`Subscription expired for user ${userId}. Downgrading to Free plan.`);
            await this.downgradeToFreePlan(userId);
            return false;
          }
        }
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error checking subscription status:', error);
      return false;
    }
  },
  
  // Check if a user can use credits based on their subscription
  async canUseCredits(userId: string): Promise<boolean> {
    try {
      // First check if subscription is active
      const isActive = await this.isSubscriptionActive(userId);
      if (!isActive) {
        // Check remaining credits for free users
        const remainingCredits = await creditUtils.getRemainingCredits(userId);
        return remainingCredits > 0;
      }
      
      // Paid users may have monthly renewal of credits
      // Check if credits need to be refreshed based on last update
      await this.refreshCreditsIfNeeded(userId);
      
      // Check remaining credits
      const remainingCredits = await creditUtils.getRemainingCredits(userId);
      return remainingCredits > 0;
    } catch (error) {
      console.error('Error checking if user can use credits:', error);
      return false;
    }
  },
  
  // Refresh credits if needed (for yearly subscriptions)
  async refreshCreditsIfNeeded(userId: string): Promise<boolean> {
    try {
      const subscriptionData = await redis.hgetall(KEYS.USER_SUBSCRIPTION(userId));
      const creditsData = await redis.hgetall(KEYS.USER_CREDITS(userId));
      
      if (!subscriptionData || !creditsData) {
        return false;
      }
      
      // Only proceed if subscription is active and yearly
      if (subscriptionData.status === 'active' && subscriptionData.interval === 'year') {
        const now = new Date();
        const lastUpdate = creditsData.lastUpdate ? new Date(creditsData.lastUpdate as string) : null;
        
        // Get plan information
        const planName = subscriptionData.plan as string;
        const planType = subscriptionData.planType as string;
        
        // Determine credit amount based on plan type
        let creditAmount = 100; // Default free plan
        if (planType === 'STANDARD') {
          creditAmount = 500;
        } else if (planType === 'PRO') {
          creditAmount = 999999; // Effectively unlimited
        }
        
        // If last update was more than a month ago or is missing, refresh credits
        if (!lastUpdate || this.isMonthDifference(lastUpdate, now)) {
          console.log(`Refreshing monthly credits for yearly subscriber ${userId}`);
          
          // Calculate next reset date - one month from now
          const resetDate = new Date(now);
          resetDate.setMonth(resetDate.getMonth() + 1);
          
          // Update credits data
          const newCreditData = {
            total: creditAmount.toString(),
            used: '0',
            resetDate: resetDate.toISOString().split('T')[0],
            lastUpdate: now.toISOString()
          };
          
          // Save to Redis
          await redis.hset(KEYS.USER_CREDITS(userId), newCreditData);
          
          return true;
        }
      }
      
      return false;
    } catch (error) {
      console.error('Error refreshing credits:', error);
      return false;
    }
  },
  
  // Helper to check if two dates are at least one month apart
  isMonthDifference(date1: Date, date2: Date): boolean {
    // Get difference in months
    const months = (date2.getFullYear() - date1.getFullYear()) * 12 + 
                 (date2.getMonth() - date1.getMonth());
    
    // If months difference is at least 1
    if (months >= 1) {
      return true;
    }
    
    // If same month but day is same or later in the next period
    if (months === 0 && date2.getDate() >= date1.getDate()) {
      return true;
    }
    
    return false;
  },
  
  // Downgrade a user to the free plan
  async downgradeToFreePlan(userId: string): Promise<boolean> {
    try {
      const now = new Date();
      
      // Update subscription data
      const subscriptionData = {
        plan: 'Free Plan',
        planType: 'FREE',
        status: 'active',
        amount: '0',
        interval: 'month',
        purchaseDate: now.toISOString(),
        renewalDate: '',
        lastUpdated: now.toISOString(),
        stripeCustomerId: '',
        stripeSubscriptionId: ''
      };
      
      // Set free credits (100)
      const creditData = {
        total: '100',
        used: '0',
        resetDate: '',
        lastUpdate: now.toISOString()
      };
      
      // Save to Redis
      await redis.hset(KEYS.USER_SUBSCRIPTION(userId), subscriptionData);
      await redis.hset(KEYS.USER_CREDITS(userId), creditData);
      
      console.log(`Successfully downgraded user ${userId} to the Free plan`);
      return true;
    } catch (error) {
      console.error('Error downgrading to free plan:', error);
      return false;
    }
  },
  
  // Scheduled task to check for expired subscriptions
  // This should be called periodically (via a cron job or similar)
  async checkExpiredSubscriptions(): Promise<void> {
    try {
      // Get all subscription keys
      const subscriptionKeys = await redis.keys('user:*:subscription');
      
      // Check each subscription
      for (const key of subscriptionKeys) {
        // Extract user ID from the key
        const userId = key.split(':')[1];
        
        // Check if subscription is active
        await this.isSubscriptionActive(userId);
      }
    } catch (error) {
      console.error('Error checking expired subscriptions:', error);
    }
  }
};