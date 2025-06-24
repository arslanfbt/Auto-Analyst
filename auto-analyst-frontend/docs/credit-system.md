# Credit System

This document covers the complete credit management system in Auto-Analyst, including allocation, usage tracking, and billing logic.

## Overview

Auto-Analyst uses a credit-based billing system where users consume credits for various features like chat analysis, code execution, and deep analysis. Credits are allocated based on subscription plans and reset monthly.

## Credit Configuration

### Plan Types and Credits

Located in `lib/credits-config.ts`:

```typescript
export const PLAN_CREDITS: Record<PlanName, PlanCredits> = {
  'Trial': {
    total: 500,
    displayName: 'Trial Plan',
    type: 'TRIAL',
    isUnlimited: false,
    minimum: 0
  },
  'Standard': {
    total: 500,
    displayName: 'Standard Plan', 
    type: 'STANDARD',
    isUnlimited: false,
    minimum: 0
  },
  'Pro': {
    total: 999999,
    displayName: 'Pro Plan',
    type: 'PRO',
    isUnlimited: true,
    minimum: 0
  }
}
```

### Credit Utilities

```typescript
export const CreditConfig = {
  // Get credits by plan type
  getCreditsByType: (type: PlanType) => PLAN_CREDITS[type],
  
  // Get credits by plan name
  getCreditsForPlan: (planName: string) => { /* implementation */ },
  
  // Check if unlimited credits
  isUnlimitedTotal: (total: number) => total >= 999999,
  
  // Get next reset date
  getNextResetDate: () => {
    const now = new Date()
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    return nextMonth.toISOString().split('T')[0]
  }
}
```

## Credit Lifecycle

### 1. Credit Initialization

**For Trial Users**:
```typescript
// app/api/trial/start/route.ts
await creditUtils.initializeTrialCredits(userId, {
  total: 500,
  resetDate: CreditConfig.getNextResetDate(),
  paymentIntentId: paymentIntent.id
})
```

**For Subscription Users**:
```typescript
// Handled by webhook: invoice.payment_succeeded
await subscriptionUtils.refreshCreditsIfNeeded(userId)
```

### 2. Credit Reset Schedule

Credits reset monthly on the 1st of each month:

```typescript
// lib/redis.ts - refreshCreditsIfNeeded()
const now = new Date()
const resetDate = new Date(creditsData.resetDate)

if (now >= resetDate) {
  // Reset credits to plan amount
  const planCredits = CreditConfig.getCreditsByType(planType)
  
  await redis.hset(KEYS.USER_CREDITS(userId), {
    total: planCredits.credits.toString(),
    used: '0',
    resetDate: CreditConfig.getNextResetDate(),
    lastUpdate: new Date().toISOString()
  })
}
```

### 3. Credit Usage Tracking

#### Deduction Process
```typescript
// app/api/user/deduct-credits/route.ts
export async function POST(request: NextRequest) {
  const { amount, description } = await request.json()
  const token = await getToken({ req: request })
  const userId = token.sub
  
  // Attempt to deduct credits
  const success = await creditUtils.deductCredits(userId, amount)
  
  if (!success) {
    return NextResponse.json(
      { 
        error: "Insufficient credits",
        required: amount,
        available: await creditUtils.getRemainingCredits(userId)
      },
      { status: 402 }
    )
  }
  
  // Return updated credit info
  const remaining = await creditUtils.getRemainingCredits(userId)
  return NextResponse.json({
    success: true,
    remainingCredits: remaining,
    deducted: amount,
    description
  })
}
```

#### Atomic Deduction Logic
```typescript
// lib/redis.ts - creditUtils.deductCredits()
async deductCredits(userId: string, amount: number): Promise<boolean> {
  const creditsHash = await redis.hgetall(KEYS.USER_CREDITS(userId))
  
  if (!creditsHash || !creditsHash.total) {
    return false // No credits available
  }
  
  const total = parseInt(creditsHash.total)
  const used = parseInt(creditsHash.used || '0')
  const available = total - used
  
  if (available < amount) {
    return false // Insufficient credits
  }
  
  // Atomic update
  await redis.hset(KEYS.USER_CREDITS(userId), {
    used: (used + amount).toString(),
    lastUpdate: new Date().toISOString()
  })
  
  return true
}
```

## Feature Credit Costs

### Current Credit Pricing

```typescript
export const FEATURE_COSTS = {
  /** Cost for deep analysis - premium feature for paid users */
  DEEP_ANALYSIS: 50,
}

// Model credit costs are based on MODEL_TIERS configuration:
// - Basic models: 1-2 credits
// - Standard models: 3-5 credits  
// - Premium models: 6-10 credits
// - Premium+ models: 11-20 credits
```

### Usage Implementation

```typescript
// For deep analysis feature
const creditsNeeded = FEATURE_COSTS.DEEP_ANALYSIS // 50 credits

const deductResponse = await fetch('/api/user/deduct-credits', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    amount: creditsNeeded,
    description: 'Deep analysis report generation'
  })
})

if (deductResponse.status === 402) {
  // Show upgrade prompt - insufficient credits
  showInsufficientCreditsModal()
  return
}

// For AI model usage (chat messages)
const modelCost = getModelCreditCost(selectedModel) // 1-20 credits based on model tier
// Credit deduction happens automatically in backend based on model used
```

## Credit Storage Schema

### Redis Structure

```typescript
// Key: user:${userId}:credits
{
  total: string                  // "500"
  used: string                   // "150" 
  resetDate: string              // "2024-02-01"
  lastUpdate: string             // ISO timestamp
  resetInterval: string          // "month"
  
  // Trial-specific fields
  isTrialCredits?: string        // "true"
  paymentIntentId?: string       // Stripe payment intent
  
  // Cancellation tracking
  trialCanceled?: string         // "true"
  subscriptionDeleted?: string   // "true"
  
  // Admin fields
  nextTotalCredits?: string      // For plan changes
  pendingDowngrade?: string      // "true"
}
```

### Data Validation

```typescript
function validateCreditData(creditsData: any) {
  const total = parseInt(creditsData.total || '0')
  const used = parseInt(creditsData.used || '0')
  
  // Validation rules
  if (total < 0) throw new Error('Total credits cannot be negative')
  if (used < 0) throw new Error('Used credits cannot be negative')
  if (used > total && total < 999999) {
    throw new Error('Used credits cannot exceed total')
  }
  
  return { total, used, remaining: total - used }
}
```

## Credit Refresh Logic

### Automatic Refresh Triggers

1. **User Data API Call** (`/api/user/data`)
2. **Credit Check API Call** (`/api/user/credits`)
3. **Webhook Events** (payment succeeded, subscription updated)
4. **Navigation Events** (chat page load with refresh flag)

### Refresh Implementation

```typescript
// lib/redis.ts - subscriptionUtils.refreshCreditsIfNeeded()
async refreshCreditsIfNeeded(userId: string): Promise<boolean> {
  const creditsData = await redis.hgetall(KEYS.USER_CREDITS(userId))
  const subscriptionData = await redis.hgetall(KEYS.USER_SUBSCRIPTION(userId))
  
  // Check if credits need reset (monthly)
  const now = new Date()
  const resetDate = new Date(creditsData.resetDate || now)
  
  if (now >= resetDate) {
    await this.resetMonthlyCredits(userId)
    return true
  }
  
  // Check for plan changes
  if (this.hasPlanChanged(creditsData, subscriptionData)) {
    await this.updateCreditsForPlanChange(userId)
    return true
  }
  
  // Check for cancellations
  if (this.shouldZeroCredits(creditsData, subscriptionData)) {
    await creditUtils.setZeroCredits(userId)
    return true
  }
  
  return false
}
```

### Reset Logic

```typescript
async resetMonthlyCredits(userId: string) {
  const subscriptionData = await redis.hgetall(KEYS.USER_SUBSCRIPTION(userId))
  const planType = subscriptionData.planType || 'STANDARD'
  const planCredits = CreditConfig.getCreditsByType(planType)
  
  await redis.hset(KEYS.USER_CREDITS(userId), {
    total: planCredits.credits.toString(),
    used: '0',
    resetDate: CreditConfig.getNextResetDate(),
    lastUpdate: new Date().toISOString(),
    resetInterval: 'month'
  })
  
  console.log(`Credits reset for user ${userId}: ${planCredits.credits} credits`)
}
```

## Credit Preservation

### Successful Trial Conversion
```typescript
// Credits are preserved when trial converts to paid
// Only genuine cancellations zero out credits

function shouldZeroCredits(creditsData: any, subscriptionData: any): boolean {
  // Genuine trial cancellation
  if (creditsData.trialCanceled === 'true') return true
  
  // Subscription deleted (not converted)
  if (creditsData.subscriptionDeleted === 'true') return true
  
  // Status is canceled and marked for cleanup
  if (subscriptionData.status === 'canceled' && 
      subscriptionData.subscriptionCanceled === 'true') return true
  
  return false
}
```

### Plan Downgrade Protection
```typescript
// Credits are preserved during plan changes within billing period
// Only reset to new plan amount at next billing cycle

async updateCreditsForPlanChange(userId: string) {
  const subscriptionData = await redis.hgetall(KEYS.USER_SUBSCRIPTION(userId))
  const newPlanType = subscriptionData.planType
  const newPlanCredits = CreditConfig.getCreditsByType(newPlanType)
  
  // Set next month's credit allocation
  await redis.hset(KEYS.USER_CREDITS(userId), {
    nextTotalCredits: newPlanCredits.credits.toString(),
    pendingDowngrade: newPlanCredits.credits < currentTotal ? 'true' : 'false'
  })
}
```

## Credit Display

### Frontend Components

#### Credit Balance Display
```typescript
// components/chat/CreditBalance.tsx
function CreditBalance() {
  const [credits, setCredits] = useState({ used: 0, total: 0 })
  const [isRefreshing, setIsRefreshing] = useState(false)
  
  const refreshCredits = async () => {
    setIsRefreshing(true)
    const response = await fetch('/api/user/credits')
    const data = await response.json()
    setCredits(data)
    setIsRefreshing(false)
  }
  
  const percentage = credits.total === Infinity ? 100 : 
    Math.round(((credits.total - credits.used) / credits.total) * 100)
  
  return (
    <div className="flex items-center gap-2">
      {isRefreshing ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <span>{credits.total - credits.used} / {credits.total}</span>
      )}
      <Progress value={percentage} className="w-16" />
    </div>
  )
}
```

#### Usage Warning
```typescript
function InsufficientCreditsModal({ requiredCredits, availableCredits }) {
  return (
    <AlertDialog>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Insufficient Credits</AlertDialogTitle>
          <AlertDialogDescription>
            You need {requiredCredits} credits but only have {availableCredits} remaining.
            Upgrade your plan to continue using this feature.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button onClick={() => router.push('/pricing')}>
            Upgrade Plan
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
```

## Monitoring and Analytics

### Credit Usage Tracking
```typescript
// Log credit usage for analytics
console.log('Credit deduction:', {
  userId,
  amount,
  feature: description,
  remainingCredits,
  timestamp: new Date().toISOString()
})
```

### Key Metrics
- Average credits per user per month
- Feature usage patterns
- Credit exhaustion rates
- Conversion rates from credit exhaustion

### Alerts
- Users approaching credit limits
- Unusual usage patterns
- Failed credit deductions
- System errors in credit processing

## Best Practices

### Credit Management
1. **Always check credits** before feature usage
2. **Handle insufficient credits gracefully** with upgrade prompts
3. **Use atomic operations** for credit deduction
4. **Preserve credits** during legitimate state transitions
5. **Reset credits monthly** regardless of billing cycle

### Error Handling
1. **Graceful degradation** when credit system fails
2. **Clear error messages** for users
3. **Retry logic** for temporary failures
4. **Logging** for debugging and monitoring

### Performance
1. **Cache credit data** in component state
2. **Batch credit operations** when possible
3. **Use Redis efficiently** with hash operations
4. **Minimize API calls** with smart refresh logic

### Security
1. **Validate all credit operations** server-side
2. **Prevent credit manipulation** via client
3. **Audit credit changes** with timestamps
4. **Rate limit** credit-related endpoints 