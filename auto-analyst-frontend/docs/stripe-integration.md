# Stripe Integration

This document covers the complete Stripe integration in Auto-Analyst, including payment processing, subscription management, and webhook handling.

## Overview

Auto-Analyst uses Stripe for:
- 7-day free trial with payment authorization
- Subscription billing (monthly/yearly)
- Payment processing
- Subscription lifecycle management
- Real-time event synchronization via webhooks

## Environment Variables

```bash
# Required Stripe Configuration
STRIPE_SECRET_KEY=sk_test_... # or sk_live_... for production
STRIPE_WEBHOOK_SECRET=whsec_... # Webhook endpoint secret

# Client-side Stripe Configuration
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_... # or pk_live_... for production
```

## Stripe Configuration

### API Version
```typescript
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-02-24.acacia',
})
```

### Required Stripe Products

#### 1. Standard Plan
```json
{
  "name": "Standard Plan",
  "prices": [
    {
      "amount": 1500,  // $15.00
      "currency": "usd",
      "interval": "month"
    }
  ]
}
```

#### 2. Pro Plan (if available)
```json
{
  "name": "Pro Plan", 
  "prices": [
    {
      "amount": 2500,  // $25.00
      "currency": "usd",
      "interval": "month"
    }
  ]
}
```

## Trial System Implementation

### 7-Day Trial Flow

1. **Subscription Creation** (`/api/checkout-sessions`) 
2. **Payment Method Setup** (Setup intent for payment authorization)
3. **Trial Activation** (`/api/trial/start`) 
4. **Trial Access** (500 credits immediately)
5. **Auto-Conversion** (After 7 days, Stripe charges automatically)

### Subscription Creation Code
```typescript
// app/api/checkout-sessions/route.ts
// Auto-Analyst creates subscription directly, not via checkout sessions
const subscription = await stripe.subscriptions.create({
  customer: customerId,
  items: [{ price: priceId }],
  trial_end: trialEndTimestamp, // 7 days from now
  expand: ['latest_invoice.payment_intent'],
  payment_behavior: 'default_incomplete',
  payment_settings: {
    save_default_payment_method: 'on_subscription',
  },
  metadata: {
    userId: userId,
    planName,
    interval,
    isTrial: 'true'
  }
})
```

## Subscription States

### State Diagram
```
[Trial Start] → [trialing] → [active] (payment successful)
                    ↓
                [canceled] (trial canceled)
                    ↓
            [subscription deleted]
```

### Status Mapping
```typescript
interface SubscriptionStatus {
  stripe: 'trialing' | 'active' | 'canceled' | 'past_due' | 'unpaid'
  redis: 'trialing' | 'active' | 'canceling' | 'canceled' | 'past_due'
  display: 'Trial' | 'Active' | 'Canceling' | 'Canceled' | 'Past Due'
}
```

## Key Stripe Objects

### Customer
```typescript
interface StripeCustomer {
  id: string              // cus_ABC123
  email: string
  created: number
  metadata: {
    userId: string        // Our internal user ID
  }
}
```

### Subscription
```typescript
interface StripeSubscription {
  id: string                    // sub_DEF456
  customer: string              // cus_ABC123
  status: SubscriptionStatus
  trial_start?: number          // Unix timestamp
  trial_end?: number            // Unix timestamp
  current_period_start: number  // Unix timestamp
  current_period_end: number    // Unix timestamp
  cancel_at_period_end: boolean // true if canceling
  canceled_at?: number          // Unix timestamp
  metadata: {
    userId: string
    userEmail: string
    isTrial: string
  }
}
```

### Payment Intent
```typescript
interface StripePaymentIntent {
  id: string                    // pi_GHI789
  customer: string              // cus_ABC123
  status: PaymentIntentStatus
  amount: number
  metadata: {
    userId: string
    isTrial: string
  }
}
```

## Subscription Management

### Creating Trial Subscription
```typescript
// Direct subscription creation with trial
const subscription = await stripe.subscriptions.create({
  customer: customerId,
  items: [{ price: priceId }],
  trial_end: trialEndTimestamp, // 7 days from now
  payment_behavior: 'default_incomplete',
  metadata: { userId, isTrial: 'true' }
})
```

### Canceling Subscription
```typescript
// app/api/trial/cancel/route.ts
if (subscription.status === 'trialing') {
  // Immediate cancellation for trials
  await stripe.subscriptions.cancel(subscriptionId, {
    prorate: false
  })
} else {
  // Cancel at period end for active subscriptions
  await stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true
  })
}
```

### Retrieving Subscription Data
```typescript
const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
  expand: ['latest_invoice', 'customer']
})
```

## Payment Processing

### Authorization vs. Capture

#### Trial Authorization
- **Authorization Only**: Payment method validated and authorized
- **No Immediate Charge**: User not charged until trial ends
- **Future Payment**: Stripe automatically charges after 7 days

#### Active Subscription
- **Immediate Charge**: Regular subscription payments charged immediately
- **Recurring Billing**: Automatic monthly/yearly charges

### Payment Method Validation
```typescript
// Validate payment method exists for trial
const paymentMethods = await stripe.paymentMethods.list({
  customer: customerId,
  type: 'card'
})

if (paymentMethods.data.length === 0) {
  throw new Error('No payment method found')
}
```

## Error Handling

### Common Stripe Errors
```typescript
try {
  await stripe.subscriptions.create(subscriptionData)
} catch (error) {
  switch (error.code) {
    case 'resource_missing':
      // Customer or price not found
      break
    case 'card_declined':
      // Payment method declined
      break
    case 'authentication_required':
      // 3D Secure required
      break
    default:
      // Generic error handling
  }
}
```

### Webhook Error Handling
```typescript
// app/api/webhooks/route.ts
export async function POST(request: NextRequest) {
  let event: Stripe.Event
  
  try {
    const body = await request.text()
    const signature = request.headers.get('stripe-signature')!
    
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }
  
  // Process event...
}
```

## Testing

### Test Cards
```typescript
// Successful payment
'4242424242424242'

// Payment requires authentication
'4000002500003155'

// Payment declined
'4000000000000002'

// Insufficient funds
'4000000000009995'
```

### Test Scenarios

#### 1. Successful Trial
```bash
# Create checkout session
POST /api/checkout-sessions
→ Redirects to Stripe checkout
→ User enters test card 4242424242424242
→ checkout.session.completed webhook fires
→ User gets trial access
```

#### 2. Trial Cancellation
```bash
# Cancel during trial
POST /api/trial/cancel
→ Stripe subscription canceled
→ customer.subscription.deleted webhook fires
→ Credits set to 0
```

#### 3. Failed Payment Authorization
```bash
# Use declined card
→ payment_intent.payment_failed webhook fires
→ Trial access prevented
```

## Monitoring and Logs

### Key Metrics
- Trial conversion rate
- Payment success rate
- Churn rate
- Revenue metrics

### Logging Strategy
```typescript
console.log(`Trial started for user ${userId}`)
console.log(`Payment succeeded for subscription ${subscriptionId}`)
console.error(`Payment failed for user ${userId}:`, error)
```

### Stripe Dashboard
- Monitor payment failures
- Track subscription metrics
- Review webhook deliveries
- Analyze customer lifecycle

## Security Best Practices

1. **Never expose secret keys** in client-side code
2. **Validate webhook signatures** for all incoming events
3. **Use HTTPS** for all webhook endpoints
4. **Implement idempotency** for webhook processing
5. **Log security events** for auditing
6. **Rate limit** API endpoints
7. **Validate user permissions** before subscription operations

## Production Considerations

### Webhook Reliability
```typescript
// Implement retry logic for failed webhook processing
const maxRetries = 3
let retryCount = 0

while (retryCount < maxRetries) {
  try {
    await processWebhook(event)
    break
  } catch (error) {
    retryCount++
    if (retryCount === maxRetries) {
      throw error
    }
    await new Promise(resolve => setTimeout(resolve, 1000 * retryCount))
  }
}
```

### Database Consistency
- Use transactions for critical operations
- Implement eventual consistency for webhook data
- Add data validation and sanitization
- Monitor for data discrepancies

### Performance
- Cache frequently accessed Stripe data
- Use webhook data to update local cache
- Implement request deduplication
- Monitor API rate limits 