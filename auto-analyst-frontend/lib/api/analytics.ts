const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
import logger from '@/lib/utils/logger'

// Helper function to add admin API key to headers
const getHeaders = (adminKey: string) => {
  logger.log(`Using admin key: ${adminKey.substring(0, 3)}...`); // Log partial key for debugging
  return {
    'Content-Type': 'application/json',
    'X-Admin-API-Key': adminKey,
  };
};

/**
 * Fetch usage summary data from the API
 */
export async function fetchUsageSummary(
  adminKey: string,
  startDate?: string,
  endDate?: string
) {
  let url = `${API_BASE_URL}/analytics/usage/summary`;
  
  // Add query parameters if provided
  const params = new URLSearchParams();
  if (startDate) {
    params.append('start_date', startDate);
  }
  if (endDate) {
    params.append('end_date', endDate);
  }
  
  if (params.toString()) {
    url += `?${params.toString()}`;
  }
  
  logger.log(`Fetching usage summary from ${url}`);
  
  const response = await fetch(url, {
    method: 'GET',
    headers: getHeaders(adminKey),
  });
  
  if (!response.ok) {
    console.error(`Error response: ${response.status} ${response.statusText}`);
    const text = await response.text();
    console.error(`Response body: ${text}`);
    throw new Error(`Error fetching usage summary: ${response.statusText}`);
  }
  
  return response.json();
}

/**
 * Fetch daily usage data from the API
 */
export async function fetchDailyUsage(adminKey: string, days: number = 30) {
  const url = `${API_BASE_URL}/analytics/daily?days=${days}`;
  
  const response = await fetch(url, {
    method: 'GET',
    headers: getHeaders(adminKey),
  });
  
  if (!response.ok) {
    throw new Error(`Error fetching daily usage: ${response.statusText}`);
  }
  
  return response.json();
}

/**
 * Fetch detailed usage data from the API
 */
export async function fetchDetailedUsage(
  adminKey: string,
  startDate?: string,
  endDate?: string,
  userId?: number,
  modelName?: string,
  provider?: string,
  limit: number = 1000
) {
  let url = `${API_BASE_URL}/analytics/usage`;
  
  // Add query parameters if provided
  const params = new URLSearchParams();
  if (startDate) params.append('start_date', startDate);
  if (endDate) params.append('end_date', endDate);
  if (userId) params.append('user_id', userId.toString());
  if (modelName) params.append('model_name', modelName);
  if (provider) params.append('provider', provider);
  if (limit) params.append('limit', limit.toString());
  
  if (params.toString()) {
    url += `?${params.toString()}`;
  }
  
  const response = await fetch(url, {
    method: 'GET',
    headers: getHeaders(adminKey),
  });
  
  if (!response.ok) {
    throw new Error(`Error fetching detailed usage: ${response.statusText}`);
  }
  
  return response.json();
} 