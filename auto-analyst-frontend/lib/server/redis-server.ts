import { Redis } from '@upstash/redis';
import { KEYS } from '../redis';
import { CreditConfig } from '../credits-config';

// Initialize Redis client for server-side operations only
const serverRedis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.UPSTASH_REDIS_REST_TOKEN || '',
});

// Server-side only Redis operations
export const serverCreditUtils = {
  async getRemainingCredits(userId: string): Promise<number> {
    try {
      // Try getting from the hash first
      const creditsHash = await serverRedis.hgetall(KEYS.USER_CREDITS(userId));
      
      if (creditsHash && creditsHash.total) {
        const total = parseInt(creditsHash.total as string);
        const used = creditsHash.used ? parseInt(creditsHash.used as string) : 0;
        return total - used;
      }
      
      // No free credits anymore - users need to pay for trial
      return 0;
    } catch (error) {
      console.error('Server Redis error fetching credits:', error);
      return 0; // No free credits anymore - users need to pay for trial
    }
  }
};

// Test server-side Redis connection
export const testServerRedisConnection = async (): Promise<{
  success: boolean;
  message: string;
}> => {
  try {
    await serverRedis.ping();
    return { 
      success: true, 
      message: 'Server Redis connection successful' 
    };
  } catch (error) {
    console.error('Server Redis connection failed:', error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

export default serverRedis; 