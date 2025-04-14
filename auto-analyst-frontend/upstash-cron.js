/**
 * Upstash QStash Scheduler Setup
 * 
 * This script configures the Upstash QStash scheduler to automatically call
 * our subscription renewal API endpoint on a daily basis.
 * 
 * Usage:
 * - Run this script to create/update the scheduler: node upstash-cron.js
 * - The script will output the schedule ID for reference
 */

// Load environment variables
require('dotenv').config({
  path: process.env.NODE_ENV === 'production' ? '.env.production.local' : '.env.local'
});

const https = require('https');
const API_URL = process.env.QSTASH_URL || 'https://qstash.upstash.io';
const API_TOKEN = process.env.QSTASH_TOKEN;

// Configuration
const CRON_EXPRESSION = '15 * * * *'; // Daily at midnight UTC
const API_ENDPOINT = process.env.NEXTAUTH_URL 
  ? `https://1ea3-111-88-174-152.ngrok-free.app/api/cron/process-renewals` 
  : 'http://localhost:3000/api/cron/process-renewals';
const SCHEDULE_ID = 'subscription-renewals';

// Validate required environment variables
if (!API_TOKEN) {
  console.error('Error: QSTASH_TOKEN environment variable is missing');
  process.exit(1);
}

// API Request to create/update the scheduler
const requestOptions = {
  method: 'POST',
  hostname: 'qstash.upstash.io',
  path: `/v2/schedules/${API_ENDPOINT}`,
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${API_TOKEN}`,
    'Upstash-Cron': CRON_EXPRESSION,
    'Upstash-Schedule-Id': SCHEDULE_ID,
    'Upstash-Retries': '3'
  }
};

// Add the API key to the request body
const requestBody = JSON.stringify({
  'x-cron-auth-key': process.env.CRON_AUTH_KEY || 'missing_key'
});

// Create/update the schedule
const req = https.request(requestOptions, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      console.log('\n✅ Successfully set up subscription renewal scheduler!');
      console.log('Schedule ID:', SCHEDULE_ID);
      console.log('Cron Expression:', CRON_EXPRESSION);
      console.log('Target Endpoint:', API_ENDPOINT);
      
      try {
        const responseData = JSON.parse(data);
        console.log('\nSchedule details:');
        console.log(JSON.stringify(responseData, null, 2));
      } catch (e) {
        console.log('\nRaw response:', data);
      }
    } else {
      console.error('\n❌ Failed to set up scheduler:', res.statusCode);
      console.error('Response:', data);
    }
  });
});

req.on('error', (error) => {
  console.error('\n❌ Error setting up scheduler:', error.message);
});

// Write request body and send the request
req.write(requestBody);
req.end();

console.log('Setting up subscription renewal scheduler...');
console.log('Connecting to Upstash QStash API...');
