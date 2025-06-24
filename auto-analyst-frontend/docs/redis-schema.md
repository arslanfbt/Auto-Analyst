# Redis Data Schema

This document describes the complete Redis data structure used in Auto-Analyst for user management, subscriptions, and credit tracking.

## Overview

Auto-Analyst uses **Upstash Redis** with a hash-based storage pattern for efficient data access and atomic operations. All user data is organized using consistent key patterns.

## Environment Variables

```bash
UPSTASH_REDIS_REST_URL=your_redis_url
UPSTASH_REDIS_REST_TOKEN=your_redis_token
```

## Key Patterns

### Core Keys
```typescript
export const KEYS = {
  USER_PROFILE: (userId: string) => `user:${userId}:profile`,
  USER_SUBSCRIPTION: (userId: string) => `user:${userId}:subscription`,
  USER_CREDITS: (userId: string) => `user:${userId}:credits`,
};

// Additional keys
stripe:customer:${customerId} -> userId (string mapping)
```

## Data Structures

### 1. User Profile (`user:${userId}:profile`)

**Hash Structure:**
```typescript
{
  email: string           // User's email address
  name: string           // User's display name
  image: string          // Profile image URL
  joinedDate: string     // ISO date string (YYYY-MM-DD)
  role: string          // Plan display name (e.g., "Standard Plan")
}
```

**Example:**
```json
{
  "email": "user@example.com",
  "name": "John Doe",
  "image": "https://example.com/avatar.jpg",
  "joinedDate": "2024-01-15",
  "role": "Standard Plan"
}
```

### 2. User Subscription (`user:${userId}:subscription`)

**Hash Structure:**
```typescript
{
  // Core subscription data
  plan: string                    // Plan display name
  planType: string               // Plan type (TRIAL, STANDARD, PRO, etc.)
  status: string                 // Subscription status
  displayStatus?: string         // UI display status (for canceling subscriptions)
  amount: string                 // Amount as string (e.g., "15.00")
  interval: string               // Billing interval (month, year)
  
  // Dates and timestamps
  purchaseDate: string           // ISO timestamp
  renewalDate: string            // Next billing date (YYYY-MM-DD)
  lastUpdated: string            // ISO timestamp
  
  // Stripe integration
  stripeCustomerId: string       // Stripe customer ID
  stripeSubscriptionId: string   // Stripe subscription ID
  stripeSubscriptionStatus: string // Direct Stripe status
  
  // Trial management
  trialStartDate?: string        // ISO timestamp
  trialEndDate?: string          // ISO timestamp
  trialEndedAt?: string          // ISO timestamp
  trialToActiveDate?: string     // ISO timestamp
  
  // Cancellation tracking
  canceledAt?: string            // ISO timestamp
  subscriptionCanceled?: string  // "true" if canceled
  cancel_at_period_end?: string  // "true"/"false"
  willCancelAt?: string          // ISO timestamp
  
  // Yearly subscription support
  isYearly?: boolean             // True for yearly plans
  nextMonthlyReset?: string      // Next credit reset for yearly plans
  
  // Synchronization
  syncedAt?: string              // Last sync timestamp
}
```

**Example:**
```json
{
  "plan": "Standard Plan",
  "planType": "STANDARD",
  "status": "active",
  "amount": "15.00",
  "interval": "month",
  "purchaseDate": "2024-01-15T10:30:00.000Z",
  "renewalDate": "2024-02-15",
  "lastUpdated": "2024-01-20T15:45:00.000Z",
  "stripeCustomerId": "cus_ABC123",
  "stripeSubscriptionId": "sub_DEF456",
  "stripeSubscriptionStatus": "active"
}
```

### 3. User Credits (`user:${userId}:credits`)

**Hash Structure:**
```typescript
{
  // Core credit data
  total: string                  // Total credits as string
  used: string                   // Used credits as string
  resetDate: string              // Next reset date (YYYY-MM-DD)
  lastUpdate: string             // ISO timestamp
  resetInterval: string          // "month" (always monthly)
  
  // Trial credits
  isTrialCredits?: string        // "true" if trial credits
  paymentIntentId?: string       // Associated payment intent
  
  // Cancellation tracking
  trialCanceled?: string         // "true" if trial was canceled
  subscriptionDeleted?: string   // "true" if subscription deleted
  downgradedAt?: string          // ISO timestamp
  canceledAt?: string            // ISO timestamp
  
  // Admin operations
  nextTotalCredits?: string      // Scheduled credit amount
  pendingDowngrade?: string      // "true" if downgrade pending
}
```

**Example:**
```json
{
  "total": "500",
  "used": "150",
  "resetDate": "2024-02-01",
  "lastUpdate": "2024-01-20T15:45:00.000Z",
  "resetInterval": "month"
}
```

### 4. Stripe Customer Mapping (`stripe:customer:${customerId}`)

**Simple String Value:**
```typescript
// Key: stripe:customer:cus_ABC123
// Value: "user123"
```

This mapping allows webhooks to find the correct user ID from Stripe customer events.

## Data Operations

### Reading Data
```typescript
// Get all subscription data
const subscriptionData = await redis.hgetall(KEYS.USER_SUBSCRIPTION(userId))

// Get specific field
const planType = await redis.hget(KEYS.USER_SUBSCRIPTION(userId), 'planType')

// Get multiple fields
const creditInfo = await redis.hmget(KEYS.USER_CREDITS(userId), ['total', 'used', 'resetDate'])
```

### Writing Data
```typescript
// Update multiple fields atomically
await redis.hset(KEYS.USER_SUBSCRIPTION(userId), {
  status: 'active',
  lastUpdated: new Date().toISOString(),
  stripeSubscriptionStatus: 'active'
})

// Set single field
await redis.hset(KEYS.USER_CREDITS(userId), 'used', '160')
```

### Atomic Operations
```typescript
// Check and update credits atomically
const creditsHash = await redis.hgetall(KEYS.USER_CREDITS(userId))
if (creditsHash && creditsHash.total) {
  const total = parseInt(creditsHash.total)
  const used = parseInt(creditsHash.used || '0')
  
  if (total - used >= requiredCredits) {
    await redis.hset(KEYS.USER_CREDITS(userId), {
      used: (used + requiredCredits).toString(),
      lastUpdate: new Date().toISOString()
    })
    return true
  }
}
return false
```

## Data Consistency

### Webhook Synchronization
All Stripe events are synchronized to Redis via webhooks to ensure data consistency:

1. **Subscription Updates**: `customer.subscription.updated` → Update subscription status
2. **Payment Success**: `invoice.payment_succeeded` → Activate subscription
3. **Payment Failure**: `invoice.payment_failed` → Handle failed payments
4. **Subscription Deletion**: `customer.subscription.deleted` → Clean up data

### Error Handling
```typescript
try {
  const result = await redis.hgetall(KEYS.USER_SUBSCRIPTION(userId))
  return result || {}
} catch (error) {
  console.error('Redis error:', error)
  return {} // Graceful fallback
}
```

## Performance Considerations

### Batch Operations
```typescript
// Use pipeline for multiple operations
const pipeline = redis.pipeline()
pipeline.hset(KEYS.USER_SUBSCRIPTION(userId), subscriptionData)
pipeline.hset(KEYS.USER_CREDITS(userId), creditData)
await pipeline.exec()
```

### Caching Strategy
- **TTL**: No TTL set on user data (persistent)
- **Invalidation**: Data updated via webhooks and API calls
- **Fallback**: API endpoints provide fallback for missing data

## Monitoring

### Key Metrics to Monitor
- Redis memory usage
- Connection count
- Operation latency
- Error rates

### Debug Endpoints
- `/api/debug/redis-check` - Check Redis data for specific user
- `/api/debug/sync-subscription` - Manual sync with Stripe

## Migration Patterns

### Adding New Fields
```typescript
// Safe field addition (backward compatible)
const subscriptionData = await redis.hgetall(KEYS.USER_SUBSCRIPTION(userId))
const newField = subscriptionData.newField || 'defaultValue'
```

### Data Migration Script Example
```typescript
async function migrateSubscriptions() {
  const keys = await redis.keys('user:*:subscription')
  
  for (const key of keys) {
    const data = await redis.hgetall(key)
    if (!data.planType) {
      await redis.hset(key, 'planType', 'STANDARD')
    }
  }
}
```

## Best Practices

1. **Always use hash operations** for user data
2. **Include timestamps** for debugging and auditing
3. **Handle missing data gracefully** with fallbacks
4. **Use atomic operations** for credit deduction
5. **Validate data types** when reading from Redis
6. **Log errors** but don't fail the user experience
7. **Use consistent key patterns** across the application 