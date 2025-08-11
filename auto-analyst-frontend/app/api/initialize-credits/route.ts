import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { creditUtils } from '@/lib/redis';

export async function GET(request: NextRequest) {
  try {
    // Get user token for authentication
    const token = await getToken({ req: request });
    if (!token?.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    
    const userId = token.sub;
    
    // Allow custom amount via query param for testing
    const searchParams = request.nextUrl.searchParams;
    const amount = searchParams.get('amount')
      ? parseInt(searchParams.get('amount') as string) 
      : parseInt(process.env.NEXT_PUBLIC_CREDITS_INITIAL_AMOUNT || '20');
    
    // Initialize credits for the user
    await creditUtils.initializeCredits(userId, amount);
    
    
    // This endpoint is for debugging/testing only
    // Don't automatically initialize credits anymore since we removed free plan
    
    // Check current credits
    const currentCredits = await creditUtils.getRemainingCredits(userId);
    
    return NextResponse.json({
      success: true,
      userId,
      message: 'Credits not initialized - use trial signup or subscription to get credits',
      currentCredits,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error checking credits:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 
