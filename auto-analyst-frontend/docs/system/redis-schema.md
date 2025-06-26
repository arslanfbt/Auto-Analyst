# Redis Schema Documentation

Auto-Analyst uses Redis for caching, session management, and user data storage.

## Redis Connection

### Configuration
```typescript
// lib/redis.ts
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
})
```

### Key Naming Convention
```typescript
export const KEYS = {
  USER_PROFILE: (userId: string) => `user:${userId}:profile`,
  USER_SUBSCRIPTION: (userId: string) => `user:${userId}:subscription`,
  USER_CREDITS: (userId: string) => `user:${userId}:credits`,
}
```

## Data Schemas

### 1. User Profile
```typescript
// Key: user:{userId}:profile
interface UserProfile {
  email: string
  name: string
  image: string
  joinedDate: string
  role: string
  lastLogin?: string
}

// Redis Hash
await redis.hset(KEYS.USER_PROFILE(userId), {
  email: "user@example.com",
  name: "John Doe",
  image: "https://...",
  joinedDate: "2024-01-01",
  role: "Free"
})
```

### 2. User Credits
```typescript
// Key: user:{userId}:credits
interface UserCredits {
  total: string
  used: string
  resetDate: string
  lastUpdate: string
  isTrialCredits?: string
  paymentIntentId?: string
}

// Redis Hash
await redis.hset(KEYS.USER_CREDITS(userId), {
  total: "500",
  used: "150",
  resetDate: "2024-02-01",
  lastUpdate: "2024-01-15T10:30:00Z"
})
```

### 3. User Subscription
```typescript
// Key: user:{userId}:subscription
interface UserSubscription {
  plan: string
  status: string
  interval: string
  amount: string
  stripeSubscriptionId?: string
  stripeCustomerId?: string
  nextBilling?: string
  cancelAtPeriodEnd?: string
}

// Redis Hash
await redis.hset(KEYS.USER_SUBSCRIPTION(userId), {
  plan: "pro",
  status: "active",
  interval: "month",
  amount: "15",
  stripeSubscriptionId: "sub_...",
  nextBilling: "2024-02-01"
})
```

## Utility Functions

### Credit Management
```typescript
export const creditUtils = {
  // Get remaining credits
  async getRemainingCredits(userId: string): Promise<number> {
    const creditsHash = await redis.hgetall(KEYS.USER_CREDITS(userId))
    if (!creditsHash?.total) return 0
    
    const total = parseInt(creditsHash.total)
    const used = parseInt(creditsHash.used || '0')
    
    return Math.max(0, total - used)
  },

  // Deduct credits
  async deductCredits(userId: string, amount: number): Promise<boolean> {
    const creditsHash = await redis.hgetall(KEYS.USER_CREDITS(userId))
    if (!creditsHash?.total) return false
    
    const total = parseInt(creditsHash.total)
    const used = parseInt(creditsHash.used || '0')
    const remaining = total - used
    
    if (remaining < amount) return false
    
    await redis.hset(KEYS.USER_CREDITS(userId), {
      used: (used + amount).toString(),
      lastUpdate: new Date().toISOString()
    })
    
    return true
  },

  // Reset credits (monthly/yearly)
  async resetUserCredits(userId: string): Promise<boolean> {
    const subscription = await redis.hgetall(KEYS.USER_SUBSCRIPTION(userId))
    if (!subscription?.plan) return false
    
    const planCredits = getPlanCredits(subscription.plan)
    const resetDate = subscription.interval === 'year' 
      ? getOneYearFromToday() 
      : getOneMonthFromToday()
    
    await redis.hset(KEYS.USER_CREDITS(userId), {
      total: planCredits.toString(),
      used: '0',
      resetDate,
      lastUpdate: new Date().toISOString()
    })
    
    return true
  }
}
```

### Subscription Management
```typescript
export const subscriptionUtils = {
  // Get user subscription data
  async getUserSubscriptionData(userId: string) {
    const [profile, subscription, credits] = await Promise.all([
      redis.hgetall(KEYS.USER_PROFILE(userId)),
      redis.hgetall(KEYS.USER_SUBSCRIPTION(userId)),
      redis.hgetall(KEYS.USER_CREDITS(userId))
    ])
    
    return {
      profile,
      subscription: subscription || { plan: 'free', status: 'active' },
      credits: {
        used: parseInt(credits?.used || '0'),
        total: parseInt(credits?.total || '0'),
        remaining: Math.max(0, parseInt(credits?.total || '0') - parseInt(credits?.used || '0'))
      }
    }
  },

  // Check if subscription is active
  async isSubscriptionActive(userId: string): Promise<boolean> {
    const subscription = await redis.hgetall(KEYS.USER_SUBSCRIPTION(userId))
    return subscription?.status === 'active' && subscription?.plan !== 'free'
  }
}
```

## Session Storage

### NextAuth Sessions
NextAuth.js handles session storage automatically, but we extend it with Redis for additional user data.

### Guest Sessions
```typescript
// For non-authenticated users
const getGuestSession = () => {
  let guestId = localStorage.getItem('guestUserId')
  if (!guestId) {
    guestId = `guest-${Date.now()}`
    localStorage.setItem('guestUserId', guestId)
  }
  return guestId
}
```

## Data Lifecycle

### User Registration
1. User signs in with Google
2. Profile saved to Redis
3. Default credits allocated (if applicable)
4. Free plan subscription created

### Subscription Changes
1. Stripe webhook received
2. Subscription data updated in Redis
3. Credits allocated based on new plan
4. Reset date calculated

### Credit Usage
1. User sends chat message
2. Model credit cost calculated
3. Credits deducted from Redis
4. UI updated with new balance

## Performance Optimization

### Batch Operations
```typescript
// Update multiple fields atomically
await redis.hset(KEYS.USER_CREDITS(userId), {
  used: newUsed.toString(),
  lastUpdate: new Date().toISOString(),
  lastAction: 'chat_message'
})
```

### Connection Pooling
- Upstash Redis handles connection pooling
- Built-in retry logic for failed requests
- Automatic failover for high availability

### Caching Strategy
- User data cached in Redis for fast access
- Frontend caches credit balance locally
- Periodic sync between client and server 