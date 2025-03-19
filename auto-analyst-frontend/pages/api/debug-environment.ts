import { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only allow in development mode
  if (process.env.NODE_ENV !== 'development') {
    return res.status(403).json({ error: 'Not available in production' });
  }
  
  try {
    // Get environment variables (safely)
    const environment = {
      NODE_ENV: process.env.NODE_ENV,
      UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL 
        ? `${process.env.UPSTASH_REDIS_REST_URL.substring(0, 20)}...` 
        : undefined,
      UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN 
        ? `${process.env.UPSTASH_REDIS_REST_TOKEN.substring(0, 8)}...` 
        : undefined,
      NEXT_PUBLIC_CREDITS_INITIAL_AMOUNT: process.env.NEXT_PUBLIC_CREDITS_INITIAL_AMOUNT,
    };
    
    return res.status(200).json({
      environment,
      serverTime: new Date().toISOString()
    });
  } catch (error: any) {
    return res.status(500).json({ 
      error: error.message || 'Unknown error'
    });
  }
} 