const { Redis } = require('@upstash/redis')

async function resetMonthlyCredits() {
  try {
    console.log('Starting monthly credit reset')
    
    const redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
    
    // Get all user credit keys
    const keys = await redis.keys('user_credits:*')
    console.log(`Found ${keys.length} users to reset credits for`)
    
    // Reset each user's credits to 100
    for (const key of keys) {
      await redis.set(key, 100)
    }
    
    console.log('Monthly credit reset completed successfully')
    return { success: true, usersReset: keys.length }
  } catch (error) {
    console.error('Error during monthly credit reset:', error)
    return { success: false, error: error.message }
  }
}

// Execute if running as main script
if (require.main === module) {
  resetMonthlyCredits()
    .then((result) => console.log(result))
    .catch((error) => console.error(error))
}

module.exports = { resetMonthlyCredits } 