"use client"

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Head from 'next/head';
import { 
  LineChart as RechartsLineChart, Line, CartesianGrid, XAxis, YAxis,
  Tooltip, Legend, ResponsiveContainer, BarChart as RechartsBarChart, Bar 
} from 'recharts';
import AnalyticsLayout from '@/components/analytics/AnalyticsLayout';
import TierAnalytics from '@/components/analytics/TierAnalytics';

// Styles that match the app's theme
const styles = {
  container: 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8',
  header: 'text-2xl font-bold text-gray-800 mb-6',
  sectionTitle: 'text-xl font-semibold text-gray-700 mb-3',
  card: 'bg-white rounded-lg shadow-md overflow-hidden',
  cardHeader: 'bg-[#FFF0F0] px-4 py-3 border-b border-gray-200',
  cardTitle: 'text-lg font-medium text-gray-800',
  cardBody: 'p-4',
  gridLayout: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8',
  statCard: 'bg-white rounded-lg shadow-sm p-6',
  statNumber: 'text-2xl font-bold text-[#FF7F7F]',
  statLabel: 'text-sm text-gray-500',
  chartContainer: 'h-80 mb-8',
  table: 'min-w-full divide-y divide-gray-200',
  tableHeader: 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider',
  tableRow: 'bg-white even:bg-gray-50',
  tableCell: 'px-6 py-4 whitespace-nowrap text-sm text-gray-500',
  loading: 'flex justify-center items-center h-64 text-gray-500',
  error: 'bg-red-50 text-red-600 p-4 rounded-md mb-4',
  authCard: 'max-w-md mx-auto bg-white rounded-lg shadow-md p-6 mt-10',
  authForm: 'space-y-4',
  authTitle: 'text-xl font-bold text-center mb-4',
  inputGroup: 'space-y-2',
  inputLabel: 'text-sm font-medium text-gray-700',
  button: 'w-full bg-[#FF7F7F] text-white py-2 px-4 rounded hover:bg-[#FF6666] transition shadow-md',
  input: 'w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#FF7F7F]',
};

// Define a more diverse color palette
const chartColors = {
  tokens: '#FF7F7F',
  cost: '#4F46E5',
  requests: '#10B981',
  avgCost: '#F59E0B',
  pieColors: ['#FF7F7F', '#4F46E5', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'],
};

export default function AnalyticsDashboard() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [adminKey, setAdminKey] = useState('');
  const [data, setData] = useState<any>(null);
  const [dailyUsage, setDailyUsage] = useState<any[]>([]);
  const [modelUsage, setModelUsage] = useState<any[]>([]);
  const realtimeSetupDone = useRef(false);

  // On first load, check if admin key exists and try to verify it
  useEffect(() => {
    const storedKey = localStorage.getItem('adminApiKey');
    if (storedKey) {
      setAdminKey(storedKey);
      verifyAdminKey(storedKey);
    } else {
      // No stored key, show login form
      setIsLoading(false);
    }
  }, []);

  // Verify the admin key by making a test request
  const verifyAdminKey = async (key: string) => {
    setIsLoading(true);
    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const response = await fetch(`${API_BASE_URL}/analytics/debug/model_usage`, {
        headers: {
          'X-Admin-API-Key': key
        }
      });

      if (!response.ok) {
        throw new Error(`Authentication failed: ${response.status} ${response.statusText}`);
      }

      // Key is valid, load dashboard data
      setIsAuthenticated(true);
      localStorage.setItem('adminApiKey', key);
      loadDashboardData(key);
    } catch (error: any) {
      console.error('Admin key verification failed:', error);
      setError(`Admin key verification failed: ${error.message}`);
      setIsLoading(false);
    }
  };

  // Load all dashboard data with the verified key
  const loadDashboardData = async (key: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      
      // Fetch summary data
      const summaryRes = await fetch(`${API_BASE_URL}/analytics/usage/summary`, { 
        headers: { 'X-Admin-API-Key': key }
      });
      
      // Fetch daily usage data
      const dailyRes = await fetch(`${API_BASE_URL}/analytics/daily?days=30`, { 
        headers: { 'X-Admin-API-Key': key }
      });
      
      // Fetch model usage data
      const modelRes = await fetch(`${API_BASE_URL}/analytics/usage/models`, { 
        headers: { 'X-Admin-API-Key': key }
      });
      
      if (!summaryRes.ok) {
        throw new Error(`Failed to fetch summary data: ${summaryRes.status} ${summaryRes.statusText}`);
      }
      
      const summaryData = await summaryRes.json();
      setData(summaryData);
      
      if (dailyRes.ok) {
        const dailyData = await dailyRes.json();
        setDailyUsage(dailyData?.daily_usage || []);
      }
      
      if (modelRes.ok) {
        const modelData = await modelRes.json();
        setModelUsage(modelData?.model_usage || []);
      }
      
    } catch (err: any) {
      console.error('Error loading dashboard data:', err);
      setError(err.message || 'Failed to load analytics data');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle admin key form submission
  const handleKeySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminKey.trim()) {
      verifyAdminKey(adminKey.trim());
    }
  };

  // Admin key login form
  if (!isAuthenticated) {
    return (
      <AnalyticsLayout title="Analytics Authentication">
        <div className={styles.container}>
          <div className={styles.authCard}>
            <h2 className={styles.authTitle}>Admin Authentication</h2>
            
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-md mb-4">
                {error}
              </div>
            )}
            
            <form onSubmit={handleKeySubmit} className={styles.authForm}>
              <div className={styles.inputGroup}>
                <label htmlFor="adminKey" className={styles.inputLabel}>
                  Admin API Key
                </label>
                <input
                  id="adminKey"
                  type="password"
                  value={adminKey}
                  onChange={(e) => setAdminKey(e.target.value)}
                  className={styles.input}
                  placeholder="Enter your admin API key"
                  disabled={isLoading}
                  required
                />
              </div>
              
              <button 
                type="submit" 
                className={styles.button}
                disabled={isLoading}
              >
                {isLoading ? 'Verifying...' : 'Access Dashboard'}
              </button>
            </form>
          </div>
        </div>
      </AnalyticsLayout>
    );
  }

  // Show loading state
  if (isLoading) {
    return (
      <AnalyticsLayout>
        <div className={styles.loading}>
          <p>Loading analytics data...</p>
        </div>
      </AnalyticsLayout>
    );
  }

  // Show dashboard if authenticated and data is loaded
  return (
    <AnalyticsLayout>
      <Head>
        <title>Analytics Dashboard</title>
      </Head>
      
      <div className={styles.container}>
        <h1 className={styles.header}>Usage Analytics</h1>
        
        {error && (
          <div className={styles.error}>{error}</div>
        )}
        
        {data ? (
          <>
            {/* Stats Overview */}
            <section className="mb-8">
              <h2 className={styles.sectionTitle}>Overview</h2>
              <div className={styles.gridLayout}>
                <div className={styles.statCard}>
                  <p className={styles.statLabel}>Total Tokens</p>
                  <p className={styles.statNumber}>{data.total_tokens?.toLocaleString() || 'N/A'}</p>
                </div>
                
                <div className={styles.statCard}>
                  <p className={styles.statLabel}>Total Cost</p>
                  <p className={styles.statNumber}>${data.total_cost?.toFixed(4) || 'N/A'}</p>
                </div>
                
                <div className={styles.statCard}>
                  <p className={styles.statLabel}>Total Requests</p>
                  <p className={styles.statNumber}>{data.total_requests?.toLocaleString() || 'N/A'}</p>
                </div>
                
                <div className={styles.statCard}>
                  <p className={styles.statLabel}>Avg. Cost / Request</p>
                  <p className={styles.statNumber}>${data.avg_cost_per_request?.toFixed(6) || 'N/A'}</p>
                </div>
              </div>
            </section>
            
            {/* Daily Usage Chart */}
            <section className="mb-8">
              <h2 className={styles.sectionTitle}>Daily Usage</h2>
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <h3 className={styles.cardTitle}>Tokens and Cost over Time</h3>
                </div>
                <div className={styles.cardBody}>
                  {dailyUsage.length > 0 ? (
                    <div className={styles.chartContainer}>
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsLineChart
                          data={dailyUsage}
                          margin={{ top: 10, right: 30, left: 20, bottom: 30 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis yAxisId="left" />
                          <YAxis yAxisId="right" orientation="right" />
                          <Tooltip 
                            formatter={(value, name) => {
                              if (name === 'tokens') return [value.toLocaleString(), 'Tokens'];
                              if (name === 'cost') return [`$${Number(value).toFixed(4)}`, 'Cost'];
                              return [value, name];
                            }}
                          />
                          <Legend />
                          <Line
                            yAxisId="left"
                            type="monotone"
                            dataKey="tokens"
                            stroke={chartColors.tokens}
                            strokeWidth={2}
                            activeDot={{ r: 8 }}
                            name="Tokens"
                          />
                          <Line
                            yAxisId="right"
                            type="monotone"
                            dataKey="cost"
                            stroke={chartColors.cost}
                            strokeWidth={2}
                            name="Cost"
                          />
                        </RechartsLineChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <p className="text-center text-gray-500">No daily usage data available</p>
                  )}
                </div>
              </div>
            </section>
            
            {/* Model Usage */}
            <section className="mb-8">
              <h2 className={styles.sectionTitle}>Model Usage</h2>
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <h3 className={styles.cardTitle}>Usage by Model</h3>
                </div>
                <div className={styles.cardBody}>
                  {modelUsage.length > 0 ? (
                    <div className={styles.chartContainer}>
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsBarChart
                          data={modelUsage}
                          margin={{ top: 10, right: 30, left: 20, bottom: 30 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="model_name" />
                          <YAxis />
                          <Tooltip
                            formatter={(value, name) => {
                              if (name === 'tokens') return [value.toLocaleString(), 'Tokens'];
                              if (name === 'cost') return [`$${Number(value).toFixed(4)}`, 'Cost'];
                              return [value, name];
                            }}
                          />
                          <Legend />
                          <Bar dataKey="tokens" fill={chartColors.tokens} name="Tokens" />
                          <Bar dataKey="cost" fill={chartColors.cost} name="Cost" />
                        </RechartsBarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <p className="text-center text-gray-500">No model usage data available</p>
                  )}
                </div>
              </div>
            </section>
            
            {/* Top Users */}
            {data.top_users && data.top_users.length > 0 && (
              <section className="mb-8">
                <h2 className={styles.sectionTitle}>Top Users</h2>
                <div className={styles.card}>
                  <div className={styles.cardHeader}>
                    <h3 className={styles.cardTitle}>Usage by User</h3>
                  </div>
                  <div className={styles.cardBody}>
                    <div className="overflow-x-auto">
                      <table className={styles.table}>
                        <thead>
                          <tr>
                            <th className={styles.tableHeader}>User ID</th>
                            <th className={styles.tableHeader}>Requests</th>
                            <th className={styles.tableHeader}>Tokens</th>
                            <th className={styles.tableHeader}>Cost</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.top_users.map((user: any, index: number) => (
                            <tr key={index} className={styles.tableRow}>
                              <td className={styles.tableCell}>{user.user_id}</td>
                              <td className={styles.tableCell}>{user.requests.toLocaleString()}</td>
                              <td className={styles.tableCell}>{user.tokens.toLocaleString()}</td>
                              <td className={styles.tableCell}>${user.cost.toFixed(4)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </section>
            )}
            
            {/* Add this clearly separated Tier Analytics section */}
            <section className="mb-8">
              <h2 className={styles.sectionTitle}>Model Tier Analysis</h2>
              <div className="border-t border-gray-200 pt-4 mt-2">
                <TierAnalytics adminKey={adminKey} />
              </div>
            </section>
          </>
        ) : (
          <div className={styles.error}>
            <h2 className="text-lg font-medium">No Analytics Data</h2>
            <p>No data found or error loading analytics. Please check your API key and try again.</p>
          </div>
        )}
      </div>
    </AnalyticsLayout>
  );
} 