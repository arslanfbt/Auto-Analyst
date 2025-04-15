# Subscription Renewal Cron Job Setup

This project uses Upstash QStash to automatically renew STANDARD plan subscriptions when their renewal date is reached. This document explains how to set up and manage the cron job.

## Prerequisites

1. An Upstash account with QStash enabled
2. Environment variables configured in `.env.local`:
   - `QSTASH_URL`
   - `QSTASH_TOKEN`
   - `QSTASH_CURRENT_SIGNING_KEY`
   - `QSTASH_NEXT_SIGNING_KEY`
   - `CRON_AUTH_KEY` (a secure random string)

## Setting Up the Cron Job

The subscription renewal cron job is configured to run daily at midnight and process all active subscriptions. It will:

1. Check all STANDARD plan subscriptions to see if their renewal date has passed
2. Automatically renew expired STANDARD subscriptions
3. Downgrade expired PRO subscriptions to FREE

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
3. When called, the endpoint processes all subscriptions in Redis, handling renewals and downgrades as needed.
4. Detailed logs are generated in your server logs.

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
3. Make sure your QStash account is active and has available requests
4. Try manually calling the endpoint to verify it's working

## Modifying the Schedule

If you need to change the schedule:

1. Edit the cron expression in `upstash-cron.js` (default is `0 0 * * *` for midnight daily)
2. Run `npm run setup-cron` again to update the schedule

Common cron expressions:
- `0 0 * * *` - Daily at midnight
- `0 */12 * * *` - Every 12 hours
- `0 0 * * 1` - Weekly on Monday midnight 