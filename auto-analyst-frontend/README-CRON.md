# Subscription Renewal Cron Job Setup

This project uses Upstash QStash to automatically handle subscription renewals via Stripe. The system processes renewal dates and keeps the Redis database synchronized with Stripe subscription statuses.

## Prerequisites

1. An Upstash account with QStash enabled
2. Stripe account with API keys configured
3. Environment variables configured in `.env.local`:
   - `QSTASH_URL`
   - `QSTASH_TOKEN`
   - `QSTASH_CURRENT_SIGNING_KEY`
   - `QSTASH_NEXT_SIGNING_KEY`
   - `CRON_AUTH_KEY` (a secure random string)
   - `STRIPE_SECRET_KEY`

## Setting Up the Cron Job

The subscription renewal cron job is configured to run daily at midnight and process all active subscriptions. It will:

1. Check all subscriptions against Stripe to verify their status
2. For STANDARD plans with active Stripe subscriptions, process renewals if the renewal date has passed
3. Downgrade expired or canceled subscriptions to FREE plans

To set up the cron job:

```bash
# Install dependencies if needed
npm install

# Run the cron job setup script
npm run setup-cron
```

This will create a scheduled task in QStash that will call your API endpoint daily.

## How It Works

1. The `upstash-cron.js` script configures QStash to call the `/api/cron/process-renewals` endpoint every day at midnight.
2. The API endpoint is secured with the `CRON_AUTH_KEY` to prevent unauthorized access.
3. When called, the endpoint:
   - Retrieves all subscription records from Redis
   - For paid plans, verifies the subscription status in Stripe
   - Downgrade subscriptions that aren't active in Stripe
   - Process renewals for STANDARD plans with valid Stripe subscriptions
4. Detailed logs are generated in your server logs.

## Stripe Integration

This system relies on Stripe for the actual payment processing. The workflow is:

1. When a user subscribes, a recurring subscription is created in Stripe
2. Stripe automatically handles billing the customer on their billing cycle
3. Our webhook handler (`/api/webhooks/route.ts`) processes Stripe events:
   - `customer.subscription.updated`: Updates Redis when Stripe processes a renewal
   - `customer.subscription.deleted`: Downgrades the user when their subscription is canceled
4. The cron job acts as a fallback to synchronize our database with Stripe

## Managing the Cron Job

You can manage your scheduled jobs through the Upstash dashboard:

1. Log in to [Upstash Console](https://console.upstash.com/)
2. Navigate to QStash
3. View and manage your scheduled jobs

## Testing the Cron Job

To manually test the endpoint:

```bash
curl -X GET https://your-domain.com/api/cron/process-renewals \
  -H "x-cron-auth-key: your-configured-key"
```

Replace `your-configured-key` with the value from your `CRON_AUTH_KEY` environment variable.

## Troubleshooting

If the cron job is not working as expected:

1. Check your server logs for error messages
2. Verify that all environment variables are correctly set
3. Check Stripe Dashboard for subscription status
4. Make sure your QStash account is active and has available requests
5. Try manually calling the endpoint to verify it's working

## Modifying the Schedule

If you need to change the schedule:

1. Edit the cron expression in `upstash-cron.js` (default is `0 0 * * *` for midnight daily)
2. Run `npm run setup-cron` again to update the schedule

Common cron expressions:
- `0 0 * * *` - Daily at midnight
- `0 */12 * * *` - Every 12 hours
- `0 0 * * 1` - Weekly on Monday midnight 