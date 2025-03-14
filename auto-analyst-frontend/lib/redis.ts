import { Redis } from '@upstash/redis'

// Initialize Redis client with better error handling
let redis: Redis;

// Check if we're in a browser environment before initializing
if (typeof window === 'undefined') {
  // Server-side execution
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  
  if (!url || !token) {
    console.error('Redis credentials missing. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in your .env file');
  }
  
  redis = new Redis({
    url: url,
    token: token,
  });
} else {
  // Client-side execution
  const url = process.env.NEXT_PUBLIC_UPSTASH_REDIS_REST_URL;
  const token = process.env.NEXT_PUBLIC_UPSTASH_REDIS_REST_TOKEN;
  
  if (!url || !token) {
    console.warn('Redis credentials missing in client. Fallback mode enabled.');
  }
  
  redis = new Redis({
    url: url,
    token: token,
  });
}

export { redis };

// Key prefix for better organization
const CREDIT_KEY_PREFIX = 'user_credits:';

// Credits management utilities with failsafe for API/connection issues
export const creditUtils = {
  // Get user's remaining credits
  async getRemainingCredits(userId: string): Promise<number> {
    try {
      const credits = await redis.get<number>(`${CREDIT_KEY_PREFIX}${userId}`);
      return credits || 0;
    } catch (error) {
      console.error('Error fetching credits:', error);
      return 100; // Failsafe - default to 100 credits if Redis is unreachable
    }
  },

  // Set initial credits for a user
  async initializeCredits(userId: string, credits: number = parseInt(process.env.NEXT_PUBLIC_CREDITS_INITIAL_AMOUNT || '100')): Promise<void> {
    try {
      await redis.set(`${CREDIT_KEY_PREFIX}${userId}`, credits);
    } catch (error) {
      console.error('Error initializing credits:', error);
      // Continue without throwing - this allows app to function without Redis
    }
  },

  // Deduct credits when a user makes an API call
  async deductCredits(userId: string, amount: number): Promise<boolean> {
    try {
      const remainingCredits = await this.getRemainingCredits(userId);
      
      // Check if user has enough credits
      if (remainingCredits < amount) {
        return false;
      }
      
      // Deduct credits using Redis decrement
      await redis.decrby(`${CREDIT_KEY_PREFIX}${userId}`, amount);
      return true;
    } catch (error) {
      console.error('Error deducting credits:', error);
      return true; // Failsafe - if Redis is down, still allow operations
    }
  },

  // Check if a user has enough credits
  async hasEnoughCredits(userId: string, amount: number): Promise<boolean> {
    try {
      const remainingCredits = await this.getRemainingCredits(userId);
      return remainingCredits >= amount;
    } catch (error) {
      console.error('Error checking credits:', error);
      return true; // Failsafe - if Redis is down, allow operations
    }
  }
}; 