/**
 * API endpoint to fetch user subscription information
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import redis from '@/lib/redis';

export async function GET(request: NextRequest) {
  try {
    // Get user session
    const session = await getServerSession();
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userEmail = session.user.email;
    
    // Fetch subscription data from Redis
    const subscriptionData = await redis.hgetall(`user:${userEmail}:subscription`);
    
    // If no subscription data exists, return free tier default
    if (!subscriptionData || Object.keys(subscriptionData).length === 0) {
      return NextResponse.json({
        tier: 'free',
        isActive: true,
        features: [],
      });
    }

    // Parse subscription data
    const subscription = {
      tier: subscriptionData.tier || 'free',
      isActive: subscriptionData.isActive === 'true',
      expiresAt: subscriptionData.expiresAt ? subscriptionData.expiresAt : null,
      features: subscriptionData.features ? JSON.parse(subscriptionData.features as string) : [],
      stripeCustomerId: subscriptionData.stripeCustomerId || null,
      stripeSubscriptionId: subscriptionData.stripeSubscriptionId || null,
    };

    // Check if subscription is expired
    if (subscription.expiresAt) {
      const expirationDate = new Date(subscription.expiresAt as string);
      const now = new Date();
      
      if (now > expirationDate) {
        // Subscription expired - update to inactive
        await redis.hset(`user:${userEmail}:subscription`, {
          isActive: 'false',
        });
        
        subscription.isActive = false;
      }
    }

    return NextResponse.json(subscription);
  } catch (error) {
    console.error('Error fetching user subscription:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get user session
    const session = await getServerSession();
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userEmail = session.user.email;
    const body = await request.json();
    
    // Validate required fields
    if (!body.tier) {
      return NextResponse.json({ error: 'Tier is required' }, { status: 400 });
    }

    // Prepare subscription data for Redis
    const subscriptionData: Record<string, string> = {
      tier: body.tier,
      isActive: String(body.isActive ?? true),
      updatedAt: new Date().toISOString(),
    };

    // Add optional fields if provided
    if (body.expiresAt) {
      subscriptionData.expiresAt = body.expiresAt;
    }
    
    if (body.features) {
      subscriptionData.features = JSON.stringify(body.features);
    }
    
    if (body.stripeCustomerId) {
      subscriptionData.stripeCustomerId = body.stripeCustomerId;
    }
    
    if (body.stripeSubscriptionId) {
      subscriptionData.stripeSubscriptionId = body.stripeSubscriptionId;
    }

    // Update subscription in Redis
    await redis.hset(`user:${userEmail}:subscription`, subscriptionData);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating user subscription:', error);
    return NextResponse.json(
      { error: 'Internal server error' }, 
      { status: 500 }
    );
  }
} 