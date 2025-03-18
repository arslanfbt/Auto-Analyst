import { NextApiRequest, NextApiResponse } from 'next';
import { getToken } from 'next-auth/jwt';
import { creditUtils } from '@/lib/redis';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // Get user token for authentication
    const token = await getToken({ req });
    if (!token?.sub) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const userId = token.sub;
    
    // Allow custom amount via query param for testing
    const amount = req.query.amount 
      ? parseInt(req.query.amount as string) 
      : parseInt(process.env.NEXT_PUBLIC_CREDITS_INITIAL_AMOUNT || '100');
    
    // Initialize credits for the user
    await creditUtils.initializeCredits(userId, amount);
    
    // Check if credits were properly set
    const currentCredits = await creditUtils.getRemainingCredits(userId);
    
    return res.status(200).json({
      success: true,
      userId,
      initializedAmount: amount,
      currentCredits,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error initializing credits:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 