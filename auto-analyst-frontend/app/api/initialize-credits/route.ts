import { NextRequest, NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { creditUtils } from '@/lib/redis';
import { CreditConfig } from '@/lib/credits-config';

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
      : CreditConfig.getDefaultInitialCredits();
    
    // Initialize credits for the user
    await creditUtils.initializeCredits(userId, amount);
    
    // Check if credits were properly set
    const currentCredits = await creditUtils.getRemainingCredits(userId);
    
    return NextResponse.json({
      success: true,
      userId,
      initializedAmount: amount,
      currentCredits,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error initializing credits:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 