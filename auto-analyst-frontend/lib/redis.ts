import { Redis } from '@upstash/redis'

// Initialize Redis client with Upstash credentials
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
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

// New schema key prefixes
export const KEYS = {
  USER_PROFILE: (userId: string) => `user:${userId}:profile`,
  USER_SUBSCRIPTION: (userId: string) => `user:${userId}:subscription`,
  USER_CREDITS: (userId: string) => `user:${userId}:credits`,
  // Legacy keys for backward compatibility
  LEGACY_CREDITS: (userId: string) => `user_credits:${userId}`,
  LEGACY_PREFIX: 'user:'
};

// Credits management utilities with improved hash-based storage
export const creditUtils = {
  // Get user's remaining credits
  async getRemainingCredits(userId: string): Promise<number> {
    try {
      // Try getting from the hash first
      const creditsHash = await redis.hgetall<{
        total?: string;
        used?: string;
      }>(KEYS.USER_CREDITS(userId));
      
      if (creditsHash && creditsHash.total) {
        const total = parseInt(creditsHash.total);
        const used = creditsHash.used ? parseInt(creditsHash.used) : 0;
        return total - used;
      }
      
      // Fall back to legacy format
      const legacyCredits = await redis.get<number>(KEYS.LEGACY_CREDITS(userId));
      if (legacyCredits !== null) {
        return legacyCredits;
      }
      
      // Try individual keys as a last resort
      const total = await redis.get<string>(`${KEYS.LEGACY_PREFIX}${userId}:creditsTotal`);
      const used = await redis.get<string>(`${KEYS.LEGACY_PREFIX}${userId}:creditsUsed`);
      
      if (total) {
        const totalNum = parseInt(total);
        const usedNum = used ? parseInt(used) : 0;
        return totalNum - usedNum;
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
      // New hash-based approach
      await redis.hset(KEYS.USER_CREDITS(userId), {
        total: credits.toString(),
        used: '0',
        lastUpdate: new Date().toISOString(),
        resetDate: this.getNextMonthFirstDay()
      });
      
      // For backward compatibility
      await redis.set(KEYS.LEGACY_CREDITS(userId), credits);
      await redis.set(`${KEYS.LEGACY_PREFIX}${userId}:creditsTotal`, credits.toString());
      await redis.set(`${KEYS.LEGACY_PREFIX}${userId}:creditsUsed`, '0');
      
      console.log(`Credits initialized successfully for ${userId}: ${credits}`);
    } catch (error) {
      console.error('Error initializing credits:', error);
    }
  },

  // Deduct credits when a user makes an API call
  async deductCredits(userId: string, amount: number): Promise<boolean> {
    try {
      // First try the hash approach
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
        
        // For backward compatibility
        await redis.set(KEYS.LEGACY_CREDITS(userId), total - newUsed);
        await redis.set(`${KEYS.LEGACY_PREFIX}${userId}:creditsUsed`, newUsed.toString());
        
        return true;
      }
      
      // Fall back to legacy approach if hash not found
      const totalStr = await redis.get<string>(`${KEYS.LEGACY_PREFIX}${userId}:creditsTotal`) || '100';
      const usedStr = await redis.get<string>(`${KEYS.LEGACY_PREFIX}${userId}:creditsUsed`) || '0';
      
      const total = parseInt(totalStr);
      const used = parseInt(usedStr);
      const remaining = total - used;
      
      if (remaining < amount) {
        return false;
      }
      
      const newUsed = used + amount;
      await redis.set(`${KEYS.LEGACY_PREFIX}${userId}:creditsUsed`, newUsed.toString());
      await redis.set(KEYS.LEGACY_CREDITS(userId), total - newUsed);
      
      return true;
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
      const sub = await redis.hgetall<{
        plan?: string;
        interval?: string;
      }>(KEYS.USER_SUBSCRIPTION(userId));
      
      if (!sub || !sub.plan) {
        // No subscription found, fallback to basic
        return false;
      }
      
      // Determine credit amount based on plan
      let creditAmount = 100; // Default
      if (sub.plan.includes('Pro')) {
        creditAmount = 999999;
      } else if (sub.plan.includes('Standard')) {
        creditAmount = 5000;
      } else if (sub.plan.includes('Basic')) {
        creditAmount = 1000;
      }
      
      // Update credits hash
      await redis.hset(KEYS.USER_CREDITS(userId), {
        total: creditAmount.toString(),
        used: '0',
        lastUpdate: new Date().toISOString(),
        resetDate: sub.interval === 'year' ? this.getNextYearFirstDay() : this.getNextMonthFirstDay()
      });
      
      // Update legacy format
      await redis.set(KEYS.LEGACY_CREDITS(userId), creditAmount);
      await redis.set(`${KEYS.LEGACY_PREFIX}${userId}:creditsTotal`, creditAmount.toString());
      await redis.set(`${KEYS.LEGACY_PREFIX}${userId}:creditsUsed`, '0');
      
      return true;
    } catch (error) {
      console.error('Error resetting user credits:', error);
      return false;
    }
  }
}; 