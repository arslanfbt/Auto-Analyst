# Feature Management System

A comprehensive feature access management system for Auto-Analyst that handles user permissions, subscription tiers, and feature gating.

## Overview

The feature management system provides:
- 🎯 **Centralized Feature Configuration**: Single source of truth for all features
- 🔐 **Access Control**: Granular permission checks based on user tiers
- 🚀 **Easy Integration**: Simple hooks and components for React
- 📊 **Real-time Updates**: Dynamic feature access based on subscription status
- 🎨 **UI Components**: Ready-to-use components for feature display

## Quick Start

### 1. Check Feature Access in Components

```tsx
import { useCanAccessFeature } from '@/lib/hooks/useFeatureAccess';
import { useUserSubscription } from '@/lib/store/userSubscriptionStore';

function MyComponent() {
  const subscription = useUserSubscription();
  const canUseDeepAnalysis = useCanAccessFeature('deep_analysis', subscription);

  return (
    <div>
      {canUseDeepAnalysis ? (
        <button>Start Deep Analysis</button>
      ) : (
        <button disabled>Upgrade to use Deep Analysis</button>
      )}
    </div>
  );
}
```

### 2. Use Feature Gates

```tsx
import FeatureGate from '@/components/features/FeatureGate';

function AdvancedFeature() {
  return (
    <FeatureGate featureId="custom_agents">
      <CustomAgentBuilder />
    </FeatureGate>
  );
}
```

### 3. Conditional Rendering

```tsx
import { InlineFeatureCheck } from '@/components/features/FeatureGate';

function Navigation() {
  return (
    <nav>
      <Link href="/dashboard">Dashboard</Link>
      <InlineFeatureCheck featureId="deep_analysis">
        <Link href="/analysis">Deep Analysis</Link>
      </InlineFeatureCheck>
    </nav>
  );
}
```

## Core Concepts

### Feature Configuration

Features are defined in `feature-config.ts`:

```typescript
export const FEATURES: Record<string, Feature> = {
  DEEP_ANALYSIS: {
    id: 'deep_analysis',
    name: 'Deep Analysis',
    description: 'Advanced data analysis capabilities',
    accessLevel: 'paid',
    status: 'coming_soon',
    category: FEATURE_CATEGORIES.ANALYSIS,
    requiredTier: ['standard', 'enterprise'],
    comingSoonEta: 'Q2 2025',
  }
};
```

### User Tiers

- **Free**: Basic features only
- **Standard**: Paid features included
- **Enterprise**: All features + enterprise-only features

### Feature Status

- **available**: Feature is ready and accessible
- **coming_soon**: Feature is in development
- **beta**: Feature is in beta testing

## API Reference

### Hooks

#### `useFeatureAccess(featureId, userSubscription)`
Returns detailed access information for a feature.

```tsx
const access = useFeatureAccess('deep_analysis', subscription);
// Returns: { hasAccess, reason, upgradeRequired, requiredTier, isComingSoon }
```

#### `useCanAccessFeature(featureId, userSubscription)`
Returns a simple boolean for feature access.

```tsx
const canAccess = useCanAccessFeature('custom_agents', subscription);
// Returns: boolean
```

#### `useFeatureGate(featureId)`
Returns comprehensive feature gate information.

```tsx
const { canAccess, needsUpgrade, requiredTier } = useFeatureGate('priority_support');
```

### Components

#### `<FeatureGate>`
Conditionally renders content based on feature access.

```tsx
<FeatureGate 
  featureId="deep_analysis"
  fallback={<UpgradePrompt />}
  showUpgradePrompt={true}
>
  <AdvancedComponent />
</FeatureGate>
```

#### `<InlineFeatureCheck>`
Simple inline conditional rendering.

```tsx
<InlineFeatureCheck 
  featureId="custom_agents"
  fallback={<ComingSoonBadge />}
>
  <AgentBuilder />
</InlineFeatureCheck>
```

#### `<FeatureGrid>`
Displays all features with access status.

```tsx
<FeatureGrid 
  showOnlyAccessible={false}
  categoryFilter="Analysis"
/>
```

### Store

#### User Subscription Store
Manages user subscription state using Zustand.

```tsx
const { subscription, fetchSubscription, updateTier } = useUserSubscriptionStore();
```

## Adding New Features

1. **Define the feature** in `feature-config.ts`:

```typescript
NEW_FEATURE: {
  id: 'new_feature',
  name: 'New Feature',
  description: 'Description of the new feature',
  accessLevel: 'paid', // 'free' | 'paid' | 'enterprise'
  status: 'available', // 'available' | 'coming_soon' | 'beta'
  category: FEATURE_CATEGORIES.CODE,
  requiredTier: ['standard', 'enterprise'],
}
```

2. **Use in components**:

```tsx
<FeatureGate featureId="new_feature">
  <NewFeatureComponent />
</FeatureGate>
```

3. **The feature is automatically available** in:
   - Feature grids and listings
   - Access control hooks
   - Permission checks

## Changing Feature Access

To change a feature from free to paid (or vice versa):

1. Update the `accessLevel` in `feature-config.ts`
2. Update `requiredTier` if needed
3. The change takes effect immediately across the app

```typescript
// Change from free to paid
AI_CODE_EDIT: {
  // ... other properties
  accessLevel: 'paid', // was 'free'
  requiredTier: ['standard', 'enterprise'], // add this
}
```

## Integration with Stripe

The system integrates with your existing Stripe setup:

1. **Subscription updates** are handled via the API endpoint `/api/user/subscription`
2. **Redis storage** maintains subscription state
3. **Real-time updates** when subscription changes occur

### API Endpoints

- `GET /api/user/subscription` - Fetch user subscription
- `POST /api/user/subscription` - Update user subscription

## Best Practices

### 1. Use Appropriate Hooks
- Use `useCanAccessFeature` for simple boolean checks
- Use `useFeatureAccess` when you need detailed access information
- Use `useFeatureGate` for comprehensive UI handling

### 2. Graceful Degradation
Always provide fallbacks for inaccessible features:

```tsx
<FeatureGate 
  featureId="advanced_feature"
  fallback={<BasicFeature />}
>
  <AdvancedFeature />
</FeatureGate>
```

### 3. Clear User Communication
Use the built-in upgrade prompts and status indicators:

```tsx
// Good: Shows why feature is unavailable and how to access it
<FeatureGate featureId="enterprise_feature" showUpgradePrompt={true}>
  <EnterpriseComponent />
</FeatureGate>
```

### 4. Performance Considerations
- Hooks are memoized for performance
- Subscription state is persisted and cached
- Feature checks are lightweight

## Examples

### Navigation Menu with Feature Gates

```tsx
function AppNavigation() {
  return (
    <nav>
      <NavItem href="/dashboard">Dashboard</NavItem>
      <NavItem href="/chat">AI Chat</NavItem>
      
      <InlineFeatureCheck featureId="deep_analysis">
        <NavItem href="/analysis">Deep Analysis</NavItem>
      </InlineFeatureCheck>
      
      <InlineFeatureCheck 
        featureId="custom_agents"
        fallback={
          <NavItem disabled badge="Coming Soon">
            Custom Agents
          </NavItem>
        }
      >
        <NavItem href="/agents">Custom Agents</NavItem>
      </InlineFeatureCheck>
    </nav>
  );
}
```

### Feature-Based Dashboard

```tsx
function Dashboard() {
  const subscription = useUserSubscription();
  
  return (
    <div className="dashboard">
      {/* Always available */}
      <BasicAnalyticsWidget />
      <ModelUsageWidget />
      
      {/* Conditional widgets */}
      <FeatureGate featureId="deep_analysis">
        <DeepAnalyticsWidget />
      </FeatureGate>
      
      <FeatureGate featureId="custom_agents">
        <AgentStatusWidget />
      </FeatureGate>
      
      <FeatureGate featureId="priority_support">
        <SupportWidget priority={true} />
      </FeatureGate>
    </div>
  );
}
```

### Action Buttons with Access Control

```tsx
function ActionBar() {
  const deepAnalysisGate = useFeatureGate('deep_analysis');
  
  return (
    <div className="action-bar">
      <Button>Basic Analysis</Button>
      
      <Button
        disabled={!deepAnalysisGate.canAccess}
        onClick={deepAnalysisGate.canAccess ? startDeepAnalysis : undefined}
        title={deepAnalysisGate.reason}
      >
        {deepAnalysisGate.needsUpgrade 
          ? `Deep Analysis (${deepAnalysisGate.requiredTier})`
          : 'Deep Analysis'
        }
      </Button>
    </div>
  );
}
```

## Testing

The feature system can be tested by:

1. **Mocking subscription state**:
```tsx
const mockSubscription = {
  tier: 'standard',
  isActive: true,
};
```

2. **Testing different access levels**:
```tsx
// Test free user
render(<Component />, { subscription: { tier: 'free' } });

// Test paid user
render(<Component />, { subscription: { tier: 'standard' } });
```

3. **Checking feature availability**:
```tsx
expect(hasFeatureAccess('deep_analysis', mockSubscription)).toEqual({
  hasAccess: false,
  upgradeRequired: true,
  requiredTier: 'standard'
});
```

## Migration Guide

If you're adding this system to an existing app:

1. **Install the feature system** files
2. **Update your subscription handling** to use the new store
3. **Gradually migrate** existing access checks to use the new hooks
4. **Add feature gates** around premium content
5. **Update your pricing page** to show feature benefits

The system is designed to be backwards compatible and can be adopted incrementally. 