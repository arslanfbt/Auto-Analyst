# Webhooks Documentation

Auto-Analyst processes webhooks from Stripe to handle subscription and payment events.

## Webhook Overview

### Supported Events
- `invoice.payment_succeeded` - Successful payment processing
- `customer.subscription.created` - New subscription created
- `customer.subscription.updated` - Subscription plan changes
- `customer.subscription.deleted` - Subscription cancellation
- `payment_intent.succeeded` - One-time payment success

### Webhook Endpoint
```typescript
// app/api/webhooks/route.ts
export async function POST(request: Request) {
  const body = await request.text()
  const sig = headers().get('Stripe-Signature')
  
  let event: Stripe.Event
  
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    return new Response(`Webhook signature verification failed`, { status: 400 })
  }
  
  // Process event
  await processWebhookEvent(event)
  
  return new Response('Webhook processed successfully', { status: 200 })
}
```

## Event Processing

### Payment Success Handler
```typescript
async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  const customerId = invoice.customer as string
  const subscriptionId = invoice.subscription as string
  
  // Get subscription details
  const subscription = await stripe.subscriptions.retrieve(subscriptionId)
  const userId = subscription.metadata.userId
  
  if (!userId) {
    console.error('No userId found in subscription metadata')
    return
  }
  
  // Update user subscription in Redis
  await redis.hset(KEYS.USER_SUBSCRIPTION(userId), {
    plan: subscription.items.data[0].price.lookup_key,
    status: subscription.status,
    interval: subscription.items.data[0].price.recurring?.interval,
    amount: (subscription.items.data[0].price.unit_amount / 100).toString(),
    stripeSubscriptionId: subscription.id,
    stripeCustomerId: customerId,
    nextBilling: new Date(subscription.current_period_end * 1000).toISOString()
  })
  
  // Allocate credits based on plan
  await allocateCreditsForPlan(userId, subscription.items.data[0].price.lookup_key)
}
```

### Subscription Deletion Handler
```typescript
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const userId = subscription.metadata.userId
  
  if (!userId) return
  
  // Downgrade to free plan
  await redis.hset(KEYS.USER_SUBSCRIPTION(userId), {
    plan: 'free',
    status: 'canceled',
    interval: 'month',
    amount: '0',
    canceledAt: new Date().toISOString()
  })
  
  // Set credits to 0
  await redis.hset(KEYS.USER_CREDITS(userId), {
    total: '0',
    used: '0',
    resetDate: '',
    lastUpdate: new Date().toISOString()
  })
}
```

### Subscription Update Handler
```typescript
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const userId = subscription.metadata.userId
  
  if (!userId) return
  
  // Update subscription details
  await redis.hset(KEYS.USER_SUBSCRIPTION(userId), {
    plan: subscription.items.data[0].price.lookup_key,
    status: subscription.status,
    cancelAtPeriodEnd: subscription.cancel_at_period_end.toString(),
    nextBilling: new Date(subscription.current_period_end * 1000).toISOString()
  })
  
  // If plan changed, reallocate credits
  if (subscription.status === 'active') {
    await allocateCreditsForPlan(userId, subscription.items.data[0].price.lookup_key)
  }
}
```

## Credit Allocation

### Plan-Based Credit Assignment
```typescript
async function allocateCreditsForPlan(userId: string, planName: string) {
  const creditAmounts = {
    'trial': 500,
    'standard': 500,
    'pro': 999999, // Unlimited
    'enterprise': 999999
  }
  
  const credits = creditAmounts[planName] || 0
  const resetDate = planName.includes('yearly') 
    ? getOneYearFromToday() 
    : getOneMonthFromToday()
  
  await redis.hset(KEYS.USER_CREDITS(userId), {
    total: credits.toString(),
    used: '0',
    resetDate,
    lastUpdate: new Date().toISOString()
  })
}
```

## Security

### Webhook Verification
```typescript
function verifyWebhookSignature(body: string, signature: string): boolean {
  try {
    stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET)
    return true
  } catch (error) {
    console.error('Webhook signature verification failed:', error)
    return false
  }
}
```

### Idempotency
```typescript
// Prevent duplicate processing
const processedEvents = new Set()

async function processWebhookEvent(event: Stripe.Event) {
  if (processedEvents.has(event.id)) {
    console.log(`Event ${event.id} already processed`)
    return
  }
  
  // Process event
  await handleEvent(event)
  
  // Mark as processed
  processedEvents.add(event.id)
  
  // Clean up old events (prevent memory leaks)
  if (processedEvents.size > 1000) {
    processedEvents.clear()
  }
}
```

## Error Handling

### Retry Logic
```typescript
async function processWithRetry(event: Stripe.Event, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await processEvent(event)
      return
    } catch (error) {
      console.error(`Attempt ${attempt} failed:`, error)
      
      if (attempt === maxRetries) {
        // Log to error tracking service
        console.error(`Failed to process event after ${maxRetries} attempts:`, event.id)
        throw error
      }
      
      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000))
    }
  }
}
```

### Dead Letter Queue
```typescript
async function handleFailedWebhook(event: Stripe.Event, error: Error) {
  // Store failed event for manual processing
  await redis.lpush('failed_webhooks', JSON.stringify({
    eventId: event.id,
    eventType: event.type,
    error: error.message,
    timestamp: new Date().toISOString(),
    data: event.data
  }))
}
```

## Monitoring

### Webhook Logs
```typescript
function logWebhookEvent(event: Stripe.Event, status: 'success' | 'error', error?: Error) {
  console.log({
    eventId: event.id,
    eventType: event.type,
    status,
    timestamp: new Date().toISOString(),
    error: error?.message
  })
}
```

### Health Checks
```typescript
// Monitor webhook processing health
export async function GET() {
  const failedCount = await redis.llen('failed_webhooks')
  
  return Response.json({
    status: failedCount > 10 ? 'unhealthy' : 'healthy',
    failedWebhooks: failedCount,
    lastProcessed: await redis.get('last_webhook_processed')
  })
} 