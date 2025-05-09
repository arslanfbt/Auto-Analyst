"use client"
import { useState, useEffect } from 'react';
import Head from 'next/head';
import TierAnalytics from '@/components/analytics/TierAnalytics';
import AnalyticsLayout from '@/components/analytics/AnalyticsLayout';

// Styles
const styles = {
  container: 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8',
  header: 'text-2xl font-bold text-gray-800 mb-6',
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

export default function TierAnalyticsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [adminKey, setAdminKey] = useState('');

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

      // Key is valid
      setIsAuthenticated(true);
      localStorage.setItem('adminApiKey', key);
      setIsLoading(false);
    } catch (error: any) {
      console.error('Admin key verification failed:', error);
      setError(`Admin key verification failed: ${error.message}`);
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
      <AnalyticsLayout title="Tier Analytics Authentication">
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

  // Show tier analytics page
  return (
    <AnalyticsLayout>
      <Head>
        <title>Model Tier Analytics</title>
      </Head>
      
      <div className={styles.container}>
        <h1 className={styles.header}>Model Tier Analytics</h1>
        
        {error && (
          <div className={styles.error}>{error}</div>
        )}
        
        <TierAnalytics adminKey={adminKey} />
      </div>
    </AnalyticsLayout>
  );
} 