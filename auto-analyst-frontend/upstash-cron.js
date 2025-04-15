require('dotenv').config({ path: '.env.local' });
const { Client } = require('@upstash/qstash');

// Initialize QStash client with token from environment
const qstash = new Client({
  token: process.env.QSTASH_TOKEN
});

// Get base URL from environment or use local development URL
const BASE_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000';

// Get authentication key for the cron endpoint
const CRON_AUTH_KEY = process.env.CRON_AUTH_KEY;

if (!CRON_AUTH_KEY) {
  console.error('Error: CRON_AUTH_KEY environment variable is not set. Please set it before running this script.');
  process.exit(1);
}

async function setupSubscriptionRenewalCron() {
  try {
    console.log('Setting up subscription renewal cron job...');
    
    // Create a scheduled job that runs daily at midnight (0 0 * * *)
    // This will call our process-renewals endpoint
    const result = await qstash.schedules.create({
      destination: `${BASE_URL}/api/cron/process-renewals`,
      cron: '0 0 * * *', // Run daily at midnight
      headers: {
        'x-cron-auth-key': CRON_AUTH_KEY
      }
    });

    console.log('✅ Subscription renewal cron job set up successfully!');
    console.log('Schedule ID:', result.scheduleId);
    console.log('Next execution:', new Date(result.nextRun).toLocaleString());
    
    return result;
  } catch (error) {
    console.error('❌ Failed to set up subscription renewal cron job:', error);
    throw error;
  }
}

// Execute the setup function
if (require.main === module) {
  setupSubscriptionRenewalCron()
    .then(() => {
      console.log('Cron job setup complete.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Error setting up cron job:', error);
      process.exit(1);
    });
}

// Export the setup function for programmatic use
module.exports = {
  setupSubscriptionRenewalCron
};