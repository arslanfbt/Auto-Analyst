# Stripe Integration Documentation

This document covers the Stripe payment processing integration for Auto-Analyst subscriptions and billing.

## Overview

Auto-Analyst uses Stripe for handling:
- Subscription management
- Payment processing
- Webhook handling
- Promo codes and discounts
- Invoice management

## Configuration

### Stripe Keys
```bash
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Product Configuration
Located in pricing configuration files with Stripe product IDs for each plan.

## Payment Flow

### 1. Checkout Session Creation
```typescript
// app/api/create-checkout-session/route.ts
const session = await stripe.checkout.sessions.create({
  payment_method_types: ['card'],
  line_items: [{
    price: priceId,
    quantity: 1,
  }],
  mode: 'subscription',
  success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
  cancel_url: `${origin}/checkout/error`,
  metadata: {
    userId: userId
  }
})
```

### 2. Webhook Processing
```typescript
// app/api/webhooks/route.ts
export async function POST(request: Request) {
  const sig = request.headers.get('stripe-signature')
  const event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
  
  switch (event.type) {
    case 'invoice.payment_succeeded':
      await handlePaymentSucceeded(event.data.object)
      break
    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(event.data.object)
      break
  }
}
```

## Subscription Management

### Plan Types
- **Trial**: 500 credits, temporary access
- **Standard**: 500 credits monthly
- **Pro**: Unlimited credits

### Credit Allocation
Credits are automatically allocated based on subscription tier via webhook processing.

## Security

- Webhook signature verification
- Secure API key management
- PCI compliance through Stripe
- No sensitive payment data stored locally 