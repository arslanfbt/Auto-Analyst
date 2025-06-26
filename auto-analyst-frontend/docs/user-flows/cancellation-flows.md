# Cancellation Flows Documentation

Auto-Analyst provides multiple cancellation options for users to manage their subscriptions.

## Cancellation Types

### 1. Immediate Cancellation
- Subscription ends immediately
- Credits removed instantly
- User downgraded to free tier
- No refund processed

### 2. End-of-Period Cancellation
- Subscription continues until next billing cycle
- Credits remain available until period end
- Automatic downgrade on next billing date
- Default cancellation method

### 3. Trial Cancellation
- 2-day trial can be canceled anytime (configurable in credits-config.ts)
- No charges if canceled before trial ends
- User reverts to free tier limits

## Implementation

### Frontend Cancellation Component
```typescript
// components/CancellationFlow.tsx
const CancellationFlow = () => {
  const [cancellationType, setCancellationType] = useState<'immediate' | 'end-of-period'>('end-of-period')
  const [isProcessing, setIsProcessing] = useState(false)
  
  const handleCancellation = async () => {
    setIsProcessing(true)
    
    try {
      const response = await fetch('/api/user/cancel-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          type: cancellationType,
          reason: selectedReason
        })
      })
      
      if (response.ok) {
        // Show success message
        toast.success('Subscription canceled successfully')
        // Redirect to dashboard
        router.push('/dashboard')
      }
    } catch (error) {
      toast.error('Failed to cancel subscription')
    } finally {
      setIsProcessing(false)
    }
  }
  
  return (
    <CancellationDialog>
      <CancellationOptions 
        value={cancellationType}
        onChange={setCancellationType}
      />
      <CancellationReasons onSelect={setSelectedReason} />
      <CancellationActions 
        onCancel={handleCancellation}
        isLoading={isProcessing}
      />
    </CancellationDialog>
  )
}
```

### API Route Handler
```typescript
// app/api/user/cancel-subscription/route.ts
export async function POST(request: NextRequest) {
  const token = await getToken({ req: request })
  if (!token?.sub) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  const { type, reason } = await request.json()
  const userId = token.sub
  
  try {
    // Get user's Stripe subscription
    const subscription = await redis.hgetall(KEYS.USER_SUBSCRIPTION(userId))
    const stripeSubscriptionId = subscription.stripeSubscriptionId
    
    if (!stripeSubscriptionId) {
      return NextResponse.json({ error: 'No active subscription' }, { status: 400 })
    }
    
    if (type === 'immediate') {
      // Cancel immediately
      await stripe.subscriptions.cancel(stripeSubscriptionId)
      await handleImmediateCancellation(userId)
    } else {
      // Cancel at period end
      await stripe.subscriptions.update(stripeSubscriptionId, {
        cancel_at_period_end: true
      })
      await handleEndOfPeriodCancellation(userId)
    }
    
    // Log cancellation reason
    await logCancellation(userId, type, reason)
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Cancellation error:', error)
    return NextResponse.json({ error: 'Cancellation failed' }, { status: 500 })
  }
}
```

## Cancellation Logic

### Immediate Cancellation
```typescript
async function handleImmediateCancellation(userId: string) {
  // Update subscription status
  await redis.hset(KEYS.USER_SUBSCRIPTION(userId), {
    status: 'canceled',
    canceledAt: new Date().toISOString(),
    cancelAtPeriodEnd: 'false'
  })
  
  // Remove credits immediately
  await redis.hset(KEYS.USER_CREDITS(userId), {
    total: '0',
    used: '0',
    resetDate: '',
    lastUpdate: new Date().toISOString()
  })
  
  // Send cancellation email
  await sendCancellationEmail(userId, 'immediate')
}
```

### End-of-Period Cancellation
```typescript
async function handleEndOfPeriodCancellation(userId: string) {
  // Mark for cancellation at period end
  await redis.hset(KEYS.USER_SUBSCRIPTION(userId), {
    cancelAtPeriodEnd: 'true',
    canceledAt: new Date().toISOString()
  })
  
  // Credits remain until period end
  // Webhook will handle final cancellation
  
  // Send confirmation email
  await sendCancellationEmail(userId, 'end-of-period')
}
```

### Trial Cancellation
```typescript
async function handleTrialCancellation(userId: string) {
  // Get trial subscription
  const subscription = await redis.hgetall(KEYS.USER_SUBSCRIPTION(userId))
  
  if (subscription.status === 'trialing') {
    // Cancel trial immediately
    await stripe.subscriptions.cancel(subscription.stripeSubscriptionId)
    
    // Revert to free plan
    await redis.hset(KEYS.USER_SUBSCRIPTION(userId), {
      plan: 'free',
      status: 'canceled',
      trialCanceled: 'true'
    })
    
    // Remove trial credits
    await redis.hset(KEYS.USER_CREDITS(userId), {
      total: '0',
      used: '0',
      isTrialCredits: 'false'
    })
  }
}
```

## User Experience

### Cancellation UI Flow
```typescript
// Step 1: Cancellation reasons
const CancellationReasons = ({ onSelect }) => {
  const reasons = [
    'Too expensive',
    'Not using it enough',
    'Found a better alternative',
    'Technical issues',
    'Other'
  ]
  
  return (
    <div className="cancellation-reasons">
      <h3>Why are you canceling?</h3>
      {reasons.map(reason => (
        <label key={reason}>
          <input 
            type="radio" 
            name="reason" 
            value={reason}
            onChange={() => onSelect(reason)}
          />
          {reason}
        </label>
      ))}
    </div>
  )
}

// Step 2: Retention offers
const RetentionOffers = ({ onAccept, onDecline }) => (
  <div className="retention-offers">
    <h3>Wait! Before you go...</h3>
    <div className="offer">
      <h4>50% off your next month</h4>
      <p>Continue with your current plan for half price</p>
      <button onClick={() => onAccept('discount')}>
        Accept Offer
      </button>
    </div>
    <button onClick={onDecline}>No, continue canceling</button>
  </div>
)

// Step 3: Final confirmation
const CancellationConfirmation = ({ plan, onConfirm }) => (
  <div className="cancellation-confirmation">
    <h3>Are you sure?</h3>
    <p>Your {plan} subscription will be canceled.</p>
    <p>You'll lose access to premium features.</p>
    <button onClick={onConfirm} className="danger">
      Yes, cancel my subscription
    </button>
  </div>
)
```

### Post-Cancellation Experience
```typescript
const PostCancellation = ({ cancellationType }) => (
  <div className="post-cancellation">
    <h2>Subscription Canceled</h2>
    
    {cancellationType === 'immediate' ? (
      <p>Your subscription has been canceled immediately.</p>
    ) : (
      <p>Your subscription will end at the current billing period.</p>
    )}
    
    <div className="next-steps">
      <h3>What happens now?</h3>
      <ul>
        <li>You can still access premium features until {endDate}</li>
        <li>Your data will be preserved for 30 days</li>
        <li>You can reactivate anytime</li>
      </ul>
    </div>
    
    <ReactivationOffer />
  </div>
)
```

## Analytics & Tracking

### Cancellation Analytics
```typescript
// Track cancellation metrics
const logCancellation = async (userId: string, type: string, reason: string) => {
  await redis.lpush('cancellation_analytics', JSON.stringify({
    userId,
    type,
    reason,
    timestamp: new Date().toISOString(),
    plan: subscription.plan,
    daysActive: calculateDaysActive(subscription.createdAt)
  }))
}

// Admin dashboard metrics
const getCancellationMetrics = async () => {
  const cancellations = await redis.lrange('cancellation_analytics', 0, -1)
  
  return {
    totalCancellations: cancellations.length,
    reasonBreakdown: calculateReasonBreakdown(cancellations),
    averageDaysActive: calculateAverageLifetime(cancellations),
    retentionOfferSuccess: calculateRetentionSuccess(cancellations)
  }
}
```

### Retention Strategies
- Discount offers for price-sensitive users
- Feature education for underutilization
- Technical support for issues
- Pause subscription option
- Win-back campaigns for canceled users 