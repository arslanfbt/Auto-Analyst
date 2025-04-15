# Subscription Renewal Cron Job Setup

This document explains how to set up the automated subscription renewal process using Upstash QStash.

## Overview

The application includes an automated process to renew STANDARD plan subscriptions when they reach their renewal date. Instead of downgrading expired STANDARD plans to FREE (as happens with PRO plans), this system automatically renews them, maintaining their subscription and resetting their credits.

## Prerequisites

1. An Upstash QStash account (https://upstash.com/)
2. The following environment variables configured:
   - `QSTASH_URL`: The Upstash QStash API URL 
   - `QSTASH_TOKEN`: Your QStash API token
   - `CRON_AUTH_KEY`: A secure random string used to authenticate cron job requests

## Setting Up the Cron Job

1. **Environment Setup**

   Ensure your `.env.local` or `.env.production.local` file contains the required variables:

   ```
   # Upstash QStash Configuration
   QSTASH_URL="https://qstash.upstash.io"
   QSTASH_TOKEN="your-qstash-token"
   
   # Security for Cron Jobs
   CRON_AUTH_KEY="your-random-secure-key"
   ```

2. **Running the Setup Script**

   Use the provided npm script to configure the cron job:

   ```bash
   npm run setup-cron
   ```

   This will create or update a QStash schedule with ID `subscription-renewals` that will call your API endpoint daily at midnight UTC.

3. **Verifying the Setup**

   After running the setup script, you should see a success message. You can also verify the scheduled job in the Upstash QStash dashboard.

## How It Works

1. **Scheduler Configuration**
   - The script creates a scheduler in QStash that triggers daily at midnight (UTC)
   - It calls your application's `/api/cron/process-renewals` endpoint
   - The request includes an authentication key for security

2. **Renewal Process**
   - When triggered, the API endpoint calls `checkSubscriptionsAndRenewals()`
   - This function checks all subscriptions for:
     - STANDARD plans that have reached their renewal date (to renew them)
     - Other plans (PRO) that have expired (to downgrade them to FREE)

3. **Security**
   - The API endpoint verifies the `x-cron-auth-key` header matches your configured key
   - This prevents unauthorized calls to the renewal endpoint

## Monitoring and Logging

The renewal process logs detailed information to your application logs, including:

- Total number of subscriptions processed
- Number of subscriptions renewed
- Number of subscriptions downgraded

## Troubleshooting

1. **Scheduler Not Running**
   - Verify your QStash token is valid
   - Check QStash dashboard for any errors or failed executions
   - Ensure your API endpoint is publicly accessible

2. **Authentication Errors**
   - Make sure `CRON_AUTH_KEY` is set in your environment
   - Ensure the same value is used in both the scheduler and the API endpoint

3. **Manual Testing**
   - You can manually trigger the renewal process by calling:
     ```
     curl -X GET http://localhost:3000/api/cron/process-renewals \
       -H "x-cron-auth-key: 1234567890"
     ```

## Modifying the Schedule

To change the frequency of the renewal check, edit the `CRON_EXPRESSION` variable in `upstash-cron.js` and re-run the setup script.

For example, to run twice daily:
```javascript
const CRON_EXPRESSION = '0 */12 * * *'; // Every 12 hours
```

Refer to [crontab.guru](https://crontab.guru) for help with cron expressions. 