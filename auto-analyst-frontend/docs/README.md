# Auto-Analyst Documentation

This documentation covers the payment processing, subscription management, and data storage systems used in Auto-Analyst.

## Table of Contents

### Core Systems
- [🔄 Redis Data Schema](./redis-schema.md) - Complete Redis data structure and key patterns
- [💳 Stripe Integration](./stripe-integration.md) - Payment processing and subscription management
- [🎯 Webhooks](./webhooks.md) - Event handling and data synchronization
- [💰 Credit System](./credit-system.md) - Credit management and billing logic

### API Reference
- [📡 API Endpoints](./api-endpoints.md) - Complete list of working endpoints
- [🔐 Authentication](./authentication.md) - User authentication and session management

### Workflows
- [🆓 Trial System](./trial-system.md) - 7-day trial implementation with Stripe manual capture
- [❌ Cancellation Flows](./cancellation-flows.md) - Different cancellation scenarios and handling

## Quick Start

1. **Environment Setup**: Ensure you have the required environment variables set up (see [Stripe Integration](./stripe-integration.md))
2. **Redis Configuration**: Review the [Redis Schema](./redis-schema.md) for data structure
3. **Webhook Setup**: Configure Stripe webhooks as described in [Webhooks](./webhooks.md)

## System Overview

Auto-Analyst uses a hybrid approach combining:
- **Stripe** for payment processing and subscription management
- **Redis** for fast user data access and caching
- **Webhooks** for real-time synchronization between Stripe and our system
- **Credit-based billing** for usage tracking and limits

## Key Features

- ✅ 7-day free trial with payment authorization
- ✅ Automatic trial-to-paid conversion
- ✅ Real-time credit tracking
- ✅ Subscription management (upgrade, downgrade, cancel)
- ✅ Webhook-based data synchronization
- ✅ Comprehensive error handling

## Support

For questions about this documentation or the system implementation, please refer to the specific documentation files or contact the development team. 