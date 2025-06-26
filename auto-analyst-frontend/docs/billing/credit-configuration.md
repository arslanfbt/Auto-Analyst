# Credit Configuration Guide

This guide explains how to configure credits, trials, and billing settings using the centralized `credits-config.ts` file.

## Overview

All credit-related configurations are managed in `lib/credits-config.ts` to ensure consistency across the application. This includes:

- Trial periods and credits
- Plan credit allocations  
- Feature costs
- Credit thresholds and warnings

## Trial Configuration

### Changing Trial Duration

To modify the trial period, update the `TRIAL_CONFIG` object:

```typescript
// lib/credits-config.ts
export const TRIAL_CONFIG: TrialConfig = {
  duration: 2,        // Change this number
  unit: 'days',       // 'days' | 'hours' | 'minutes' | 'weeks'
  displayText: '2-Day Free Trial',  // Update display text
  credits: 500        // Trial credits
}
```

**Examples:**
```typescript
// 7-day trial
{
  duration: 7,
  unit: 'days', 
  displayText: '7-Day Free Trial',
  credits: 1000
}

// 48-hour trial  
{
  duration: 48,
  unit: 'hours',
  displayText: '48-Hour Trial', 
  credits: 200
}
```

### Trial Utilities

The `TrialUtils` class provides helper methods:

```typescript
// Get trial duration in milliseconds
TrialUtils.getTrialDurationMs()

// Get trial end timestamp for Stripe
TrialUtils.getTrialEndTimestamp()

// Check if trial has expired
TrialUtils.isTrialExpired(trialEndDate)

// Get display text
TrialUtils.getTrialDisplayText() // "2-Day Free Trial"
```

## Plan Credit Configuration

### Modifying Plan Credits

Update credit allocations in the `PLAN_CREDITS` object:

```typescript
export const PLAN_CREDITS: Record<PlanName, PlanCredits> = {
  'Trial': {
    total: 500,              // Trial credits
    displayName: 'Trial Plan',
    type: 'TRIAL',
    isUnlimited: false
  },
  'Standard': {
    total: 1000,             // Monthly Standard credits
    displayName: 'Standard Plan', 
    type: 'STANDARD',
    isUnlimited: false
  },
  'Pro': {
    total: 999999,           // "Unlimited" threshold
    displayName: 'Pro Plan',
    type: 'PRO', 
    isUnlimited: true
  }
}
```

### Adding New Plans

To add a new plan type:

1. **Add to TypeScript types:**
```typescript
export type PlanType = 'TRIAL' | 'STANDARD' | 'PRO' | 'ENTERPRISE'
export type PlanName = 'Trial' | 'Standard' | 'Pro' | 'Enterprise'
```

2. **Add plan configuration:**
```typescript
'Enterprise': {
  total: 5000,
  displayName: 'Enterprise Plan',
  type: 'ENTERPRISE', 
  isUnlimited: false,
  minimum: 1000
}
```

3. **Update normalization logic:**
```typescript
private static normalizePlanName(planName: string): PlanName {
  const normalized = planName.toLowerCase().trim()
  
  if (normalized.includes('enterprise')) return 'Enterprise'
  // ... existing logic
}
```

## Feature Costs

### Configuring Feature Pricing

Update feature costs in the `FEATURE_COSTS` object:

```typescript
export const FEATURE_COSTS = {
  DEEP_ANALYSIS: 50,        // Current: 50 credits
  CODE_GENERATION: 10,      // Example: New feature
  DATASET_UPLOAD: 25,       // Example: New feature
}
```

### Using Feature Costs

```typescript
// Check if user can afford a feature
const canAfford = CreditConfig.canAffordDeepAnalysis(userCredits)

// Get feature cost
const cost = CreditConfig.getDeepAnalysisCost() // 50

// Custom feature check
const hasCredits = userCredits >= FEATURE_COSTS.CODE_GENERATION
```

## Credit Thresholds

### Warning and Limit Configuration

```typescript
export const CREDIT_THRESHOLDS: CreditThresholds = {
  unlimitedThreshold: 99999,    // When to show "Unlimited"
  defaultTrial: 500,            // Default trial credits
  warningThreshold: 80          // Warn at 80% usage
}
```

### Usage Examples

```typescript
// Check if plan appears unlimited
const isUnlimited = CreditConfig.isUnlimitedTotal(999999) // true

// Check if user should be warned
const shouldWarn = CreditConfig.shouldWarnLowCredits(400, 500) // true (80% used)

// Format credits for display
const display = CreditConfig.formatCreditTotal(999999) // "Unlimited"
```

## Environment-Specific Configuration

### Development vs Production

For different environments, you can use environment variables:

```typescript
// Example: Environment-specific trial credits
export const TRIAL_CONFIG: TrialConfig = {
  duration: parseInt(process.env.TRIAL_DURATION || '2'),
  unit: 'days',
  displayText: `${process.env.TRIAL_DURATION || '2'}-Day Free Trial`,
  credits: parseInt(process.env.TRIAL_CREDITS || '500')
}

// Non-authenticated user limits
const MAX_FREE_QUERIES = process.env.NODE_ENV === 'development' ? 20000 : 0
```

## Utility Functions

### CreditConfig Class Methods

```typescript
// Plan operations
CreditConfig.getCreditsForPlan('Standard')     // Get plan credits
CreditConfig.isUnlimitedPlan('Pro')           // Check if unlimited
CreditConfig.getAllPlans()                    // Get all plan configs

// Credit calculations  
CreditConfig.calculateUsagePercentage(250, 500)  // 50%
CreditConfig.hasCreditsRemaining(450, 500)       // true
CreditConfig.formatRemainingCredits(450, 500)    // "50"

// Date utilities
CreditConfig.getNextResetDate()               // Next month reset
CreditConfig.getTrialEndDate()               // Trial end date
```

## Impact of Changes

### What Gets Updated Automatically

When you modify `credits-config.ts`, these components update automatically:

- **Trial displays** (duration, credits shown in UI)
- **Plan comparisons** (pricing page, upgrade prompts)  
- **Credit warnings** (low credit notifications)
- **Usage calculations** (progress bars, percentages)
- **Feature access** (deep analysis, premium features)

### Manual Updates Required

Some areas may need manual updates:

- **Stripe configuration** (trial periods in payment setup)
- **Database migrations** (if adding new plan types)
- **API documentation** (if changing credit costs)
- **Marketing copy** (landing page, emails)

## Best Practices

### 1. Test Changes Thoroughly
```bash
# Test different scenarios
npm run test:credits
npm run test:trial-flows
```

### 2. Coordinate with Backend
Ensure backend credit costs match frontend configuration:

```python
# auto-analyst-backend/src/utils/model_registry.py
MODEL_TIERS = {
    "tier1": {"credits": 1},   # Must match frontend MODEL_TIERS
    "tier2": {"credits": 3},
    "tier3": {"credits": 5}, 
    "tier4": {"credits": 20}
}
```

> **Note**: Model-specific configurations are managed through the Model Registry. See [Model Registry Guide](../system/model-registry.md) for adding new models.

### 3. Document Changes
Update this documentation when making significant changes to credit configuration.

### 4. Consider Migration Path
When changing existing plans, provide migration logic for existing users.

## Troubleshooting

### Common Issues

1. **Trial not reflecting changes**: Clear Redis cache and restart application
2. **Credit display incorrect**: Check `CreditProvider` context updates
3. **Stripe trial mismatch**: Update Stripe configuration to match `TRIAL_CONFIG`

### Debug Utilities

```typescript
// Debug current configuration
console.log('Trial Config:', TrialUtils.getTrialConfig())
console.log('All Plans:', CreditConfig.getAllPlans())
console.log('Feature Costs:', FEATURE_COSTS)
``` 