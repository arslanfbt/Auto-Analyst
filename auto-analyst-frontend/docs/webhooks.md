# Webhooks

This document covers all Stripe webhooks implemented in Auto-Analyst, their purposes, and data synchronization logic.

## Overview

Auto-Analyst uses Stripe webhooks to maintain real-time synchronization between Stripe and our Redis database. All webhooks are processed through a single endpoint: `/api/webhooks/route.ts`

## Webhook Configuration

### Endpoint URL
```
https://your-domain.com/api/webhooks
```

### Required Events
The following events must be configured in your Stripe dashboard:

```typescript
const requiredEvents = [
  'checkout.session.completed',
  'customer.subscription.updated', 
  'customer.subscription.deleted',
  'customer.subscription.trial_will_end',
  'invoice.payment_succeeded',
  'invoice.payment_failed',
  'payment_intent.payment_failed',
  'payment_intent.canceled',
  'setup_intent.setup_failed',
  'payment_intent.requires_action'
]
```

## Webhook Security

### Signature Verification
```typescript
export async function POST(request: NextRequest) {
  const signature = request.headers.get('stripe-signature')
  
  if (!signature) {
    return NextResponse.json({ error: 'No Stripe signature found' }, { status: 400 })
  }
  
  const rawBody = await getRawBody(request.body as unknown as Readable)
  
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret)
  } catch (err: any) {
    console.error(`⚠️ Webhook signature verification failed.`, err.message)
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 })
  }
  
  // Process event...
}
```

### Environment Variables
```bash
STRIPE_WEBHOOK_SECRET=whsec_...  # From Stripe Dashboard
```

## Webhook Events

### 1. `checkout.session.completed`

**Purpose**: Logs successful checkout completion (legacy - now handled by trial flow)

**Processing Logic**:
```typescript
case 'checkout.session.completed': {
  const session = event.data.object as Stripe.Checkout.Session
  console.log(`Checkout session completed: ${session.id} - handled by trial flow`)
  return NextResponse.json({ received: true })
}
```

**Redis Updates**: None (logging only)

### 2. `customer.subscription.updated`

**Purpose**: Synchronizes subscription status changes

**Processing Logic**:
```typescript
case 'customer.subscription.updated': {
  const subscription = event.data.object as Stripe.Subscription
  const userId = await getUserIdFromCustomerId(subscription.customer as string)
  
  const updateData: any = {
    status: subscription.status,
    lastUpdated: new Date().toISOString(),
    stripeSubscriptionStatus: subscription.status
  }
  
  // Handle specific status transitions
  if (currentStatus === 'trialing' && subscription.status === 'active') {
    updateData.trialEndedAt = new Date().toISOString()
    updateData.trialToActiveDate = new Date().toISOString()
  }
  
  if (subscription.status === 'canceled') {
    updateData.canceledAt = new Date().toISOString()
  }
  
  await redis.hset(KEYS.USER_SUBSCRIPTION(userId), updateData)
  break
}
```

**Redis Updates**: 
- Subscription status
- Status transition timestamps
- Stripe synchronization data

### 3. `customer.subscription.deleted`

**Purpose**: Handles subscription cancellation and cleanup

**Processing Logic**:
```typescript
case 'customer.subscription.deleted': {
  const subscription = event.data.object as Stripe.Subscription
  const userId = await getUserIdFromCustomerId(subscription.customer as string)
  
  // Set credits to 0 immediately when subscription is canceled
  await creditUtils.setZeroCredits(userId)
  
  // Update subscription data to reflect cancellation
  await redis.hset(KEYS.USER_SUBSCRIPTION(userId), {
    plan: 'No Active Plan',
    planType: 'NONE',
    status: 'canceled',
    amount: '0',
    interval: 'month',
    lastUpdated: now.toISOString(),
    canceledAt: now.toISOString(),
    stripeCustomerId: '',
    stripeSubscriptionId: ''
  })
  
  // Mark credits as subscription deleted
  await redis.hset(KEYS.USER_CREDITS(userId), {
    total: '0',
    used: '0',
    resetDate: '',
    lastUpdate: now.toISOString(),
    subscriptionDeleted: 'true'
  })
  
  break
}
```

**Redis Updates**:
- Subscription status → 'canceled'
- Credits → 0
- Plan → 'No Active Plan'
- Cleanup Stripe IDs

### 4. `customer.subscription.trial_will_end`

**Purpose**: Logs upcoming trial expiration (for potential email notifications)

**Processing Logic**:
```typescript
case 'customer.subscription.trial_will_end': {
  const subscription = event.data.object as Stripe.Subscription
  const userId = await getUserIdFromCustomerId(subscription.customer as string)
  
  // Optional: Send reminder email about trial ending
  // You can add email notification logic here
  
  return NextResponse.json({ received: true })
}
```

**Redis Updates**: None (logging only)

### 5. `invoice.payment_succeeded`

**Purpose**: Handles successful payments and trial conversions

**Processing Logic**:
```typescript
case 'invoice.payment_succeeded': {
  const invoice = event.data.object as Stripe.Invoice
  
  if (invoice.subscription) {
    const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string)
    const userId = await getUserIdFromCustomerId(subscription.customer as string)
    
    if (invoice.billing_reason === 'subscription_cycle') {
      // Trial ended, first payment successful
      await redis.hset(KEYS.USER_SUBSCRIPTION(userId), {
        status: 'active',
        lastUpdated: new Date().toISOString(),
        trialEndedAt: new Date().toISOString(),
        lastPaymentDate: new Date().toISOString(),
        stripeSubscriptionStatus: subscription.status
      })
    } else if (invoice.billing_reason === 'subscription_create') {
      // Initial subscription creation payment
      await redis.hset(KEYS.USER_SUBSCRIPTION(userId), {
        status: subscription.status,
        lastUpdated: new Date().toISOString(),
        initialPaymentDate: new Date().toISOString(),
        stripeSubscriptionStatus: subscription.status
      })
    }
  }
  
  return NextResponse.json({ received: true })
}
```

**Redis Updates**:
- Status activation
- Payment timestamps
- Trial conversion tracking

### 6. `invoice.payment_failed`

**Purpose**: Handles failed recurring payments

**Processing Logic**:
```typescript
case 'invoice.payment_failed': {
  const invoice = event.data.object as Stripe.Invoice
  
  if (invoice.subscription && invoice.billing_reason === 'subscription_cycle') {
    const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string)
    const userId = await getUserIdFromCustomerId(subscription.customer as string)
    
    // Set credits to 0 and mark subscription as past_due
    await creditUtils.setZeroCredits(userId)
    
    await redis.hset(KEYS.USER_SUBSCRIPTION(userId), {
      status: 'past_due',
      lastUpdated: new Date().toISOString(),
      paymentFailedAt: new Date().toISOString()
    })
  }
  
  return NextResponse.json({ received: true })
}
```

**Redis Updates**:
- Status → 'past_due'
- Credits → 0
- Payment failure timestamp

### 7. Payment Protection Events

These events prevent trial access when payment authorization fails:

#### `payment_intent.payment_failed`
```typescript
case 'payment_intent.payment_failed': {
  const paymentIntent = event.data.object as Stripe.PaymentIntent
  
  if (paymentIntent.metadata?.isTrial === 'true') {
    const userId = paymentIntent.metadata?.userId
    
    if (userId) {
      // Prevent trial access by ensuring credits remain at 0
      await creditUtils.setZeroCredits(userId)
      
      await redis.hset(KEYS.USER_SUBSCRIPTION(userId), {
        status: 'payment_failed',
        lastUpdated: new Date().toISOString(),
        paymentFailedAt: new Date().toISOString(),
        failureReason: 'Payment authorization failed during trial signup'
      })
    }
  }
  break
}
```

#### `payment_intent.canceled`
```typescript
case 'payment_intent.canceled': {
  const paymentIntent = event.data.object as Stripe.PaymentIntent
  
  if (paymentIntent.metadata?.isTrial === 'true') {
    const userId = paymentIntent.metadata?.userId
    
    if (userId) {
      await creditUtils.setZeroCredits(userId)
      
      await redis.hset(KEYS.USER_SUBSCRIPTION(userId), {
        status: 'canceled',
        lastUpdated: new Date().toISOString(),
        canceledAt: new Date().toISOString(),
        cancelReason: 'Payment intent canceled during trial signup'
      })
    }
  }
  break
}
```

#### `setup_intent.setup_failed`
```typescript
case 'setup_intent.setup_failed': {
  const setupIntent = event.data.object as Stripe.SetupIntent
  
  if (setupIntent.metadata?.is_trial_setup === 'true') {
    const subscriptionId = setupIntent.metadata?.subscription_id
    
    if (subscriptionId) {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId)
      const userId = await getUserIdFromCustomerId(subscription.customer as string)
      
      // Cancel the trial subscription since setup failed
      await stripe.subscriptions.cancel(subscriptionId)
      
      // Ensure user doesn't get trial access
      await creditUtils.setZeroCredits(userId)
      
      await redis.hset(KEYS.USER_SUBSCRIPTION(userId), {
        status: 'setup_failed',
        lastUpdated: new Date().toISOString(),
        setupFailedAt: new Date().toISOString(),
        failureReason: 'Payment method setup failed during trial signup'
      })
    }
  }
  break
}
```

#### `payment_intent.requires_action`
```typescript
case 'payment_intent.requires_action': {
  const paymentIntent = event.data.object as Stripe.PaymentIntent
  
  if (paymentIntent.metadata?.isTrial === 'true') {
    const userId = paymentIntent.metadata?.userId
    console.log(`Trial payment requires 3D Secure authentication for user ${userId}`)
    
    // Don't grant trial access until authentication is complete
  }
  break
}
```

## Helper Functions

### User ID Resolution
```typescript
async function getUserIdFromCustomerId(customerId: string): Promise<string | null> {
  try {
    const userId = await redis.get(`stripe:customer:${customerId}`)
    return userId
  } catch (error) {
    console.error('Error getting userId from Redis:', error)
    return null
  }
}
```

### Error Handling
```typescript
try {
  // Process webhook event
  await processWebhookEvent(event)
  return NextResponse.json({ received: true })
} catch (error: any) {
  console.error('Webhook error:', error)
  return NextResponse.json({ error: error.message || 'Webhook handler failed' }, { status: 500 })
}
```

## Webhook Testing

### Local Development
```bash
# Install Stripe CLI
stripe listen --forward-to localhost:3000/api/webhooks

# Trigger test events
stripe trigger customer.subscription.updated
stripe trigger invoice.payment_succeeded
```

### Test Event Data
```typescript
// Mock subscription update
{
  "id": "evt_test_webhook",
  "object": "event",
  "type": "customer.subscription.updated",
  "data": {
    "object": {
      "id": "sub_test123",
      "customer": "cus_test123",
      "status": "active",
      "trial_end": 1643723400
    }
  }
}
```

## Monitoring

### Webhook Delivery
- Check Stripe Dashboard → Webhooks → Endpoint logs
- Monitor delivery success/failure rates
- Review retry attempts

### Error Tracking
```typescript
// Log all webhook events for debugging
console.log('Webhook received:', {
  type: event.type,
  id: event.id,
  created: event.created,
  livemode: event.livemode
})
```

## Best Practices

1. **Idempotency**: Handle duplicate events gracefully
2. **Fast Response**: Return 200 quickly, process asynchronously if needed
3. **Error Handling**: Return 5xx for retriable errors, 4xx for permanent failures
4. **Logging**: Log all events for debugging and monitoring
5. **Validation**: Verify event structure before processing
6. **Security**: Always verify webhook signatures
7. **Data Consistency**: Use atomic operations for Redis updates 