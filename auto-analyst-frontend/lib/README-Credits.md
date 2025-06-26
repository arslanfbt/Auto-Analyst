# Centralized Credit Configuration

This document explains the centralized credit allocation system implemented in `lib/credits-config.ts`.

## Overview

Previously, credit values were hardcoded throughout the application, making it difficult to maintain and update. The centralized configuration system consolidates all credit-related logic into a single file.

## Configuration File

### Location
`lib/credits-config.ts`

### Key Components

#### Plan Configuration
```typescript
export const PLAN_CREDITS: Record<PlanName, PlanCredits> = {
  'Free': {
    total: 100,
    displayName: 'Free Plan',
    type: 'FREE',
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

#### Credit Thresholds
```typescript
export const CREDIT_THRESHOLDS: CreditThresholds = {
  unlimitedThreshold: 99999,
  defaultInitial: 100,
  warningThreshold: 80 // Warn when user has used 80% of credits
}
```

## Utility Methods

The `CreditConfig` class provides utility methods for:

- **Plan Management**: `getCreditsForPlan()`, `getCreditsByType()`
- **Credit Validation**: `isUnlimitedPlan()`, `isUnlimitedTotal()`
- **Display Formatting**: `formatCreditTotal()`, `formatRemainingCredits()`
- **Usage Calculations**: `calculateUsagePercentage()`, `shouldWarnLowCredits()`

## Usage Examples

### Getting Credits for a Plan
```typescript
import { CreditConfig } from '@/lib/credits-config'

// Get credits for a specific plan
const standardCredits = CreditConfig.getCreditsForPlan('Standard')
console.log(standardCredits.total) // 500

// Get credits by plan type
const proCredits = CreditConfig.getCreditsByType('PRO')
console.log(proCredits.total) // 999999
```

### Formatting Credits for Display
```typescript
// Format credit totals
const totalDisplay = CreditConfig.formatCreditTotal(999999) // "Unlimited"
const totalDisplay2 = CreditConfig.formatCreditTotal(500) // "500"

// Format remaining credits
const remaining = CreditConfig.formatRemainingCredits(50, 999999) // "Unlimited"
const remaining2 = CreditConfig.formatRemainingCredits(50, 500) // "450"
```

### Usage Percentage Calculations
```typescript
// Calculate usage percentage
const percentage = CreditConfig.calculateUsagePercentage(80, 100) // 80
const percentageUnlimited = CreditConfig.calculateUsagePercentage(100, 999999) // 5 (small value for UI)

// Check if user should be warned
const shouldWarn = CreditConfig.shouldWarnLowCredits(85, 100) // true (85% usage)
```

## Files Updated
git 
The following files have been updated to use the centralized configuration:

### Frontend
- `app/account/page.tsx` - Account page credit display
- `app/pricing/page.tsx` - Pricing page (if applicable)

### Backend APIs
- `app/api/user/data/route.ts` - User data retrieval
- `app/api/update-credits/route.ts` - Credit updates after payment
- `app/api/webhooks/route.ts` - Stripe webhook handling
- `app/api/user/cancel-subscription/route.ts` - Subscription cancellation
- `app/api/initialize-credits/route.ts` - Credit initialization

### Utilities
- `lib/redis.ts` - Redis utilities for credit management

## Benefits

1. **Single Source of Truth**: All credit values are defined in one place
2. **Easy Updates**: Change credit values by updating the config file
3. **Type Safety**: TypeScript interfaces ensure consistency
4. **Centralized Logic**: Credit formatting and validation logic is reusable
5. **Maintainable**: Easier to understand and modify credit behavior

## Making Changes

To update credit values:

1. Edit `lib/credits-config.ts`
2. Update the `PLAN_CREDITS` object with new values
3. The changes will automatically apply across the entire application

To add a new plan:

1. Add the plan to the `PLAN_CREDITS` object
2. Update the `PlanName` type if needed
3. The new plan will be available throughout the application

## Migration Notes

- All hardcoded credit values have been replaced with centralized config calls
- The behavior remains the same, but is now centrally managed
- No database migration is required as this only affects application logic 