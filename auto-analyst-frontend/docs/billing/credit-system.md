# Credit System Documentation

The Auto-Analyst credit system manages user usage and billing based on AI model consumption.

## Credit Overview

### Credit Types
- **Standard Credits**: Used for basic models (1-5 credits per query)
- **Premium Credits**: Used for advanced models (10-20 credits per query)
- **Unlimited**: Pro plan users have unlimited usage

### Model Tiers
```typescript
// lib/model-registry.ts
export const MODEL_TIERS = {
  "tier1": { "credits": 1, "models": ["claude-3-5-haiku", "llama3-8b"] },
  "tier2": { "credits": 3, "models": ["gpt-4o-mini", "o1-mini"] },
  "tier3": { "credits": 5, "models": ["gpt-4o", "claude-3-5-sonnet"] },
  "tier4": { "credits": 20, "models": ["o1-pro", "claude-3-opus"] }
}
```

## Credit Management

### Credit Provider (React Context)
```typescript
// lib/contexts/credit-context.tsx
const CreditProvider = ({ children }) => {
  const [remainingCredits, setRemainingCredits] = useState(0)
  const [isChatBlocked, setIsChatBlocked] = useState(false)
  
  const checkCredits = async () => {
    // Fetch from API or Redis
    const credits = await fetch('/api/user/credits')
    setRemainingCredits(credits.remaining)
  }
  
  const deductCredits = async (amount) => {
    // Optimistic update + server sync
    setRemainingCredits(prev => prev - amount)
    return await creditUtils.deductCredits(userId, amount)
  }
}
```

### Credit Storage
- **Redis**: Server-side credit tracking
- **Local Storage**: Client-side caching
- **Context**: Real-time UI updates

## Credit Flow

### 1. Pre-flight Check
```typescript
const handleMessageSend = async (message) => {
  const cost = getModelCreditCost(selectedModel)
  
  if (!await hasEnoughCredits(cost)) {
    setInsufficientCreditsModalOpen(true)
    return
  }
  
  // Proceed with message
}
```

### 2. Credit Deduction
```typescript
// Deduct after successful API response
if (response.ok) {
  await deductCredits(modelCost)
}
```

### 3. Credit Reset
```typescript
// Monthly/yearly reset based on subscription
const resetUserCredits = async (userId) => {
  const subscription = await getSubscription(userId)
  const newCredits = getPlanCredits(subscription.plan)
  
  await redis.hset(KEYS.USER_CREDITS(userId), {
    total: newCredits,
    used: '0',
    resetDate: getNextResetDate(subscription.interval)
  })
}
```

## UI Components

### Credit Balance Display
```typescript
const CreditBalance = () => {
  const { remainingCredits, isLoading } = useCredits()
  
  return (
    <div className="credit-display">
      {isLoading ? (
        <Skeleton className="w-16 h-4" />
      ) : (
        <span>{remainingCredits} credits</span>
      )}
    </div>
  )
}
```

### Insufficient Credits Modal
- Triggered when user lacks credits
- Options to upgrade subscription
- Shows current usage and limits

## Credit Analytics

### Usage Tracking
- Model usage by user
- Cost analysis per query
- Credit consumption patterns
- Popular model preferences

### Admin Dashboard
- Total credit usage
- Revenue per credit
- User consumption analytics
- Credit allocation efficiency 