# Trial System Documentation

Auto-Analyst offers a trial system for new users to test the platform before subscribing.

## Trial Types

### Free Trial (Non-authenticated) 
- **Duration**: None (disabled in production)
- **Credits**: 0 queries maximum  
- **Features**: Landing page access only
- **Storage**: Local browser storage
- **Note**: Non-authenticated users cannot send queries in production

### 2-Day Trial (Authenticated)
- **Duration**: 2 days from activation (configurable in `credits-config.ts`)
- **Credits**: 500 credits
- **Features**: Full platform access
- **Storage**: Redis with user account

> **Configuration**: Trial duration and credits are centrally managed in `lib/credits-config.ts`. See [Credit Configuration Guide](./credit-configuration.md) for details.

## Implementation

### Frontend Store
```typescript
// lib/store/freeTrialStore.ts
export const useFreeTrialStore = create<FreeTrialStore>()(
  persist(
    (set, get) => ({
      queriesUsed: 0,
      maxQueries: 5,
      
      hasFreeTrial: () => {
        const { queriesUsed, maxQueries } = get()
        return queriesUsed < maxQueries
      },
      
      incrementQueries: () => {
        set((state) => ({
          queriesUsed: Math.min(state.queriesUsed + 1, state.maxQueries)
        }))
      }
    }),
    { name: 'free-trial-storage' }
  )
)
```

### Trial Activation
```typescript
// Trial starts when user creates account
const activateTrial = async (userId: string) => {
  await creditUtils.initializeTrialCredits(
    userId, 
    paymentIntentId, 
    trialEndDate
  )
}
```

## Trial Management

### Credit Initialization
- 500 credits allocated on trial start
- Credits stored in Redis with expiration
- Automatic cleanup after trial period

### Trial Expiration
- Users redirected to subscription page
- Credits set to 0 automatically
- Graceful degradation to free tier

## UI Components

### Trial Overlay
```typescript
const FreeTrialOverlay = () => {
  const { queriesUsed, maxQueries } = useFreeTrialStore()
  
  if (queriesUsed >= maxQueries) {
    return <SubscriptionPrompt />
  }
  
  return null
}
```

### Trial Status
- Credit counter in header
- Progress indicators
- Upgrade prompts at appropriate times 