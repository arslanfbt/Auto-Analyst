# Cancellation Flows

This document covers all cancellation scenarios in Auto-Analyst, including trial cancellations, subscription cancellations, and the different handling logic for each case.

## Overview

Auto-Analyst handles two distinct cancellation scenarios with different behaviors:

1. **Trial Cancellation** (0-7 days): Immediate access removal, no charges
2. **Post-Payment Cancellation** (7+ days): Access maintained until period end

## Cancellation Types

### 1. Trial Cancellation (Immediate)

**When**: User cancels during 7-day trial period
**Effect**: Immediate access removal, no charges ever made
**Implementation**: Cancel Stripe subscription immediately

```typescript
// Subscription status: 'trialing'
await stripe.subscriptions.cancel(subscriptionId, {
  prorate: false
})

// Immediate credit removal
await creditUtils.setZeroCredits(userId)
```

### 2. Active Subscription Cancellation (End of Period)

**When**: User cancels after trial conversion (paid subscription)
**Effect**: Access maintained until billing period ends
**Implementation**: Set `cancel_at_period_end: true`

```typescript
// Subscription status: 'active'
await stripe.subscriptions.update(subscriptionId, {
  cancel_at_period_end: true
})

// Access maintained until period_end
// Credits preserved until cancellation date
```

## Implementation

### Unified Cancellation Endpoint

**File**: `app/api/trial/cancel/route.ts`

```typescript
export async function POST(request: NextRequest) {
  const token = await getToken({ req: request })
  const userId = token.sub
  
  // Get user's subscription data
  const subscriptionData = await redis.hgetall(KEYS.USER_SUBSCRIPTION(userId))
  const subscriptionId = subscriptionData.stripeSubscriptionId
  
  if (!subscriptionId) {
    return NextResponse.json(
      { error: 'No subscription found' },
      { status: 404 }
    )
  }
  
  // Retrieve current subscription from Stripe
  const subscription = await stripe.subscriptions.retrieve(subscriptionId)
  
  if (subscription.status === 'trialing') {
    // TRIAL CANCELLATION: Immediate
    return await handleTrialCancellation(userId, subscriptionId)
  } else if (subscription.status === 'active') {
    // ACTIVE CANCELLATION: End of period
    return await handleActiveCancellation(userId, subscription)
  } else {
    return NextResponse.json(
      { error: `Cannot cancel subscription with status: ${subscription.status}` },
      { status: 400 }
    )
  }
}
```

### Trial Cancellation Handler

```typescript
async function handleTrialCancellation(
  userId: string, 
  subscriptionId: string
) {
  try {
    // Cancel subscription immediately
    await stripe.subscriptions.cancel(subscriptionId, {
      prorate: false
    })
    
    // Mark as trial cancellation in Redis
    await redis.hset(KEYS.USER_CREDITS(userId), {
      trialCanceled: 'true',
      canceledAt: new Date().toISOString()
    })
    
    // Update subscription status
    await redis.hset(KEYS.USER_SUBSCRIPTION(userId), {
      status: 'canceled',
      displayStatus: 'canceled',
      canceledAt: new Date().toISOString(),
      subscriptionCanceled: 'true'
    })
    
    console.log(`Trial canceled for user ${userId}`)
    
    return NextResponse.json({
      success: true,
      canceled: true,
      creditsRemoved: true,
      message: 'Trial canceled successfully. You will not be charged.'
    })
  } catch (error) {
    console.error('Trial cancellation error:', error)
    return NextResponse.json(
      { error: 'Failed to cancel trial' },
      { status: 500 }
    )
  }
}
```

### Active Subscription Cancellation Handler

```typescript
async function handleActiveCancellation(
  userId: string,
  subscription: Stripe.Subscription
) {
  try {
    // Set cancel at period end
    const updatedSubscription = await stripe.subscriptions.update(
      subscription.id,
      { cancel_at_period_end: true }
    )
    
    const periodEnd = new Date(subscription.current_period_end * 1000)
    
    // Update Redis with cancellation info
    await redis.hset(KEYS.USER_SUBSCRIPTION(userId), {
      cancel_at_period_end: 'true',
      willCancelAt: periodEnd.toISOString(),
      displayStatus: 'canceling',
      lastUpdated: new Date().toISOString()
    })
    
    console.log(`Active subscription marked for cancellation: ${userId}`)
    
    return NextResponse.json({
      success: true,
      canceledAtPeriodEnd: true,
      accessUntil: periodEnd.toISOString(),
      message: `Your subscription will cancel on ${periodEnd.toLocaleDateString()}. You'll maintain access until then.`
    })
  } catch (error) {
    console.error('Active cancellation error:', error)
    return NextResponse.json(
      { error: 'Failed to cancel subscription' },
      { status: 500 }
    )
  }
}
```

## Webhook Handling

### Subscription Deletion Webhook

**Event**: `customer.subscription.deleted`

```typescript
case 'customer.subscription.deleted': {
  const subscription = event.data.object as Stripe.Subscription
  const userId = await getUserIdFromCustomerId(subscription.customer as string)
  
  if (!userId) {
    console.error('No userId found for customer:', subscription.customer)
    break
  }
  
  // Update subscription status
  await redis.hset(KEYS.USER_SUBSCRIPTION(userId), {
    status: 'canceled',
    stripeSubscriptionStatus: 'canceled',
    displayStatus: 'canceled',
    canceledAt: new Date().toISOString(),
    subscriptionDeleted: 'true',
    lastUpdated: new Date().toISOString(),
    syncedAt: new Date().toISOString()
  })
  
  // Set credits to 0 for canceled subscriptions
  await creditUtils.setZeroCredits(userId)
  
  console.log(`Subscription deleted for user ${userId}, credits set to 0`)
  break
}
```

### Subscription Update Webhook

**Event**: `customer.subscription.updated`

```typescript
case 'customer.subscription.updated': {
  const subscription = event.data.object as Stripe.Subscription
  const userId = await getUserIdFromCustomerId(subscription.customer as string)
  
  // Handle cancel_at_period_end status
  if (subscription.status === 'active' && subscription.cancel_at_period_end) {
    await redis.hset(KEYS.USER_SUBSCRIPTION(userId), {
      status: 'active',
      displayStatus: 'canceling',
      cancel_at_period_end: 'true',
      willCancelAt: new Date(subscription.current_period_end * 1000).toISOString(),
      lastUpdated: new Date().toISOString(),
      syncedAt: new Date().toISOString()
    })
  } else {
    await redis.hset(KEYS.USER_SUBSCRIPTION(userId), {
      status: subscription.status,
      displayStatus: subscription.status,
      cancel_at_period_end: subscription.cancel_at_period_end.toString(),
      lastUpdated: new Date().toISOString(),
      syncedAt: new Date().toISOString()
    })
  }
  
  break
}
```

## Credit Management During Cancellation

### Trial Cancellation Credit Logic

```typescript
// Immediate credit removal for trial cancellations
async function handleTrialCreditRemoval(userId: string) {
  await redis.hset(KEYS.USER_CREDITS(userId), {
    total: '0',
    used: '0',
    trialCanceled: 'true',
    canceledAt: new Date().toISOString(),
    lastUpdate: new Date().toISOString()
  })
  
  console.log(`Credits removed for trial cancellation: ${userId}`)
}
```

### Active Subscription Credit Logic

```typescript
// Credits preserved until period end
async function handleActiveCreditPreservation(
  userId: string, 
  periodEndDate: Date
) {
  // Credits remain active until cancellation date
  // No immediate changes to credit allocation
  
  await redis.hset(KEYS.USER_CREDITS(userId), {
    willResetAt: periodEndDate.toISOString(),
    pendingCancellation: 'true',
    lastUpdate: new Date().toISOString()
  })
  
  console.log(`Credits preserved until ${periodEndDate.toISOString()} for user ${userId}`)
}
```

## Status Display Logic

### Frontend Status Mapping

```typescript
function getDisplayStatus(subscription: SubscriptionData) {
  // Use displayStatus if available (for UI-specific states)
  if (subscription.displayStatus) {
    return {
      status: subscription.displayStatus,
      color: getStatusColor(subscription.displayStatus),
      message: getStatusMessage(subscription.displayStatus)
    }
  }
  
  // Fallback to subscription status
  return {
    status: subscription.status,
    color: getStatusColor(subscription.status),
    message: getStatusMessage(subscription.status)
  }
}

function getStatusColor(status: string) {
  switch (status) {
    case 'trialing': return 'blue'
    case 'active': return 'green'
    case 'canceling': return 'amber'  // Special UI state
    case 'canceled': return 'red'
    case 'past_due': return 'orange'
    default: return 'gray'
  }
}

function getStatusMessage(status: string) {
  switch (status) {
    case 'trialing': return 'Trial period active'
    case 'active': return 'Subscription active'
    case 'canceling': return 'Will cancel at period end'
    case 'canceled': return 'Subscription canceled'
    case 'past_due': return 'Payment past due'
    default: return 'Unknown status'
  }
}
```

### Account Page Display

```typescript
// components/account/SubscriptionStatus.tsx
function SubscriptionStatus({ subscription }: { subscription: SubscriptionData }) {
  const displayStatus = getDisplayStatus(subscription)
  
  return (
    <div className="flex items-center gap-2">
      <Badge variant={displayStatus.color}>
        {displayStatus.status}
      </Badge>
      
      {subscription.status === 'canceling' && (
        <div className="text-sm text-amber-600">
          Cancels on {new Date(subscription.willCancelAt).toLocaleDateString()}
        </div>
      )}
      
      {subscription.status === 'trialing' && (
        <div className="text-sm text-blue-600">
          Trial ends {new Date(subscription.trialEndDate).toLocaleDateString()}
        </div>
      )}
    </div>
  )
}
```

## Cancellation Prevention

### Retry Logic for Failed Payments

```typescript
// Webhook: invoice.payment_failed
case 'invoice.payment_failed': {
  const invoice = event.data.object as Stripe.Invoice
  
  // Don't immediately cancel - Stripe will retry
  console.log(`Payment failed for invoice ${invoice.id}`, {
    attemptCount: invoice.attempt_count,
    nextPaymentAttempt: invoice.next_payment_attempt
  })
  
  // Update status to past_due but maintain access
  await redis.hset(KEYS.USER_SUBSCRIPTION(userId), {
    status: 'past_due',
    displayStatus: 'past_due',
    lastPaymentFailure: new Date().toISOString()
  })
  
  break
}
```

### Win-Back Campaigns

```typescript
// Trigger win-back email for canceling subscriptions
async function triggerWinBackCampaign(userId: string, cancellationReason?: string) {
  const userData = await redis.hgetall(KEYS.USER_PROFILE(userId))
  
  // Send targeted email based on cancellation timing
  if (subscription.status === 'trialing') {
    await sendEmail(userData.email, 'trial-cancellation-winback')
  } else {
    await sendEmail(userData.email, 'subscription-cancellation-winback')
  }
}
```

## Reactivation

### Resubscribe Flow

```typescript
// Allow users to reactivate canceled subscriptions
async function reactivateSubscription(userId: string, subscriptionId: string) {
  try {
    // Remove cancel_at_period_end flag
    const subscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: false
    })
    
    // Update Redis status
    await redis.hset(KEYS.USER_SUBSCRIPTION(userId), {
      status: 'active',
      displayStatus: 'active',
      cancel_at_period_end: 'false',
      reactivatedAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString()
    })
    
    // Restore credits if needed
    await subscriptionUtils.refreshCreditsIfNeeded(userId)
    
    return { success: true, reactivated: true }
  } catch (error) {
    console.error('Reactivation failed:', error)
    throw error
  }
}
```

## Error Handling

### Cancellation Errors

```typescript
// Handle common cancellation errors
async function handleCancellationError(error: any, userId: string) {
  switch (error.code) {
    case 'resource_missing':
      // Subscription not found
      await cleanupOrphanedSubscription(userId)
      break
      
    case 'subscription_canceled':
      // Already canceled
      await syncCancellationStatus(userId)
      break
      
    default:
      console.error('Unexpected cancellation error:', error)
      throw error
  }
}
```

### Data Consistency

```typescript
// Ensure Redis and Stripe stay in sync
async function validateCancellationState(userId: string) {
  const redisData = await redis.hgetall(KEYS.USER_SUBSCRIPTION(userId))
  const stripeSubscription = await stripe.subscriptions.retrieve(
    redisData.stripeSubscriptionId
  )
  
  // Check for discrepancies
  if (redisData.status !== stripeSubscription.status) {
    console.warn('Status mismatch detected:', {
      userId,
      redis: redisData.status,
      stripe: stripeSubscription.status
    })
    
    // Sync with Stripe as source of truth
    await syncSubscriptionStatus(userId, stripeSubscription)
  }
}
```

## Testing Cancellation Flows

### Test Scenarios

1. **Trial Cancellation**
   ```bash
   # Start trial, then cancel within 7 days
   POST /api/trial/cancel
   # Expected: Immediate access removal, no charge
   ```

2. **Active Cancellation**
   ```bash
   # Convert trial to paid, then cancel
   POST /api/trial/cancel  
   # Expected: Access until period end
   ```

3. **Webhook Cancellation**
   ```bash
   stripe trigger customer.subscription.deleted
   # Expected: Cleanup in Redis, credits zeroed
   ```

4. **Reactivation**
   ```bash
   # Cancel subscription, then reactivate
   # Expected: Restored access and credits
   ```

## Monitoring

### Cancellation Metrics

- **Trial Cancellation Rate**: % of trials canceled before conversion
- **Churn Rate**: % of paid subscriptions canceled per month
- **Reactivation Rate**: % of canceled users who resubscribe
- **Time to Cancel**: Average days from signup to cancellation

### Alerting

```typescript
// Monitor for unusual cancellation patterns
const cancellationMetrics = {
  trialCancellations: await getTrialCancellations('last_24h'),
  activeCancellations: await getActiveCancellations('last_24h'),
  reactivations: await getReactivations('last_24h')
}

if (cancellationMetrics.trialCancellations > threshold.trial) {
  await sendAlert('High trial cancellation rate detected')
}
```

## Best Practices

### Cancellation UX
1. **Clear consequences**: Explain what happens when canceling
2. **Retention offers**: Present alternatives before confirming
3. **Easy reactivation**: Allow users to easily resubscribe
4. **Feedback collection**: Understand why users are canceling

### Technical Implementation
1. **Immediate feedback**: Confirm cancellation success instantly
2. **Data consistency**: Keep Redis and Stripe synchronized
3. **Graceful degradation**: Handle edge cases smoothly
4. **Comprehensive logging**: Track all cancellation events

### Business Logic
1. **Preserve trial conversion**: Don't make trials too restrictive
2. **Honor commitments**: Maintain access for paid periods
3. **Win-back opportunities**: Engage canceled users appropriately
4. **Analytics driven**: Use data to improve retention 