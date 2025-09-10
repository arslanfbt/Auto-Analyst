"use client"

import { useState, useEffect } from 'react';
import AnalyticsLayout from '@/components/analytics/AnalyticsLayout';
import { 
  LineChart as RechartsLineChart, Line, BarChart as RechartsBarChart, Bar, XAxis, YAxis, 
  CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';

// Styling consistent with other pages
const styles = {
  container: 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8',
  header: 'text-2xl font-bold text-gray-800 mb-6',
  sectionTitle: 'text-xl font-semibold text-gray-700 mb-3',
  card: 'bg-white rounded-lg shadow-md overflow-hidden mb-8',
  cardHeader: 'bg-[#FFF0F0] px-4 py-3 border-b border-gray-200',
  cardTitle: 'text-lg font-medium text-gray-800',
  cardBody: 'p-6',
  chartContainer: 'h-80',
  table: 'min-w-full divide-y divide-gray-200',
  tableHeader: 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider',
  tableRow: 'bg-white even:bg-gray-50',
  tableCell: 'px-6 py-4 whitespace-nowrap text-sm text-gray-500',
  loading: 'flex justify-center items-center h-64 text-gray-500',
  error: 'bg-red-50 text-red-600 p-4 rounded-md mb-4',
  searchContainer: 'flex gap-4 mb-6 bg-white', // updated to make the color of the search container white
  searchInput: 'flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#FF7F7F] bg-white text-gray-800', // updated to make the input background white
  searchButton: 'bg-[#FF7F7F] text-white px-4 py-2 rounded-md hover:bg-[#FF6666] transition shadow-md',
  filters: 'flex flex-wrap gap-4 mb-6 text-black',
  filterButton: 'px-3 py-1 rounded-md border border-gray-300 text-sm',
  filterButtonActive: 'px-3 py-1 rounded-md border border-[#FF7F7F] bg-[#FFF0F0] text-[#FF7F7F] text-sm',
};

// Enhanced color palette for users page
const chartColors = {
  activeUsers: '#FF7F7F',
  newUsers: '#4F46E5',
  totalUsers: '#10B981',
  sessionsToday: '#F59E0B',
  avgSessionTime: '#8B5CF6',
  avgQueries: '#EC4899',
};

export default function UserActivityPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [userActivity, setUserActivity] = useState<any[]>([]);
  const [sessionStats, setSessionStats] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [period, setPeriod] = useState('30d');

  useEffect(() => {
    fetchUserData();
  }, [period]);

  const fetchUserData = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const adminKey = localStorage.getItem('adminApiKey');
      if (!adminKey) {
        setError('Admin API key not found. Please authenticate from the main dashboard.');
        setIsLoading(false);
        return;
      }
      
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      
      // Fetch users with pagination support
      const usersRes = await fetch(`${API_BASE_URL}/analytics/users?limit=100`, { 
        headers: { 'X-Admin-API-Key': adminKey }
      });
      
      if (!usersRes.ok) {
        throw new Error(`Failed to fetch user data: ${usersRes.status}`);
      }
      
      const userData = await usersRes.json();
      setUsers(userData.users || []);
      
      // Fetch user activity with real-time data
      const activityRes = await fetch(`${API_BASE_URL}/analytics/users/activity?period=${period || '30d'}`, { 
        headers: { 'X-Admin-API-Key': adminKey }
      });
      
      if (activityRes.ok) {
        const activityData = await activityRes.json();
        setUserActivity(activityData.user_activity || []);
      }
      
      // Fetch session stats with real-time data
      const statsRes = await fetch(`${API_BASE_URL}/analytics/users/sessions/stats`, { 
        headers: { 'X-Admin-API-Key': adminKey }
      });
      
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setSessionStats(statsData);
      }
      
      // Add real-time updates with WebSocket if available
      setupRealtimeUpdates();
      
    } catch (err: any) {
      console.error('Error loading user data:', err);
      setError(err.message || 'Failed to load user data');
    } finally {
      setIsLoading(false);
    }
  };

  // Add WebSocket for real-time updates
  const setupRealtimeUpdates = () => {
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const wsUrl = API_BASE_URL.replace('http', 'ws') + '/analytics/realtime';
    
    try {
      const socket = new WebSocket(wsUrl);
      
      socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        if (data.type === 'user_activity') {
          // Update user activity in real-time
          setUserActivity((current: any[]) => {
            const updated = [...current];
            // Find and update the latest data point
            if (updated.length > 0 && updated[updated.length-1].date === data.date) {
              updated[updated.length-1] = {...updated[updated.length-1], ...data.metrics};
            } else {
              updated.push({date: data.date, ...data.metrics});
            }
            return updated;
          });
        }
        
        if (data.type === 'session_stats') {
          // Update session stats in real-time
          setSessionStats((current: any) => ({...current, ...data.stats}));
        }
      };
      
      socket.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
      
      socket.onclose = () => {
        // logger.log('WebSocket connection closed');
      };
      
      return () => {
        socket.close();
      };
    } catch (err) {
      console.warn('WebSocket connection not available, falling back to polling');
      // Implement polling fallback if needed
    }
  };

  // Filter users based on search term and active filter
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.user_id.toString().includes(searchTerm);
    if (activeFilter === 'all') return matchesSearch;
    if (activeFilter === 'highUsage') return matchesSearch && user.tokens > 10000;
    if (activeFilter === 'lowUsage') return matchesSearch && user.tokens <= 10000;
    return matchesSearch;
  });

  return (
    <AnalyticsLayout title="User Activity | Auto-Analyst Analytics">
      <div className={styles.container}>
        <h1 className={styles.header}>User Activity</h1>
        
        {isLoading ? (
          <div className={styles.loading}>Loading user data...</div>
        ) : error ? (
          <div className={styles.error}>{error}</div>
        ) : (
          <>
            {/* Activity Over Time */}
            <h2 className={styles.sectionTitle}>Activity Overview</h2>
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h3 className={styles.cardTitle}>User Activity Over Time</h3>
              </div>
              <div className={styles.cardBody}>
                <div className={styles.chartContainer}>
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsLineChart
                      data={userActivity}
                      margin={{ top: 10, right: 30, left: 20, bottom: 30 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="activeUsers" 
                        stroke={chartColors.activeUsers}
                        strokeWidth={2}
                        name="Active Users"
                        activeDot={{ r: 8 }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="newUsers" 
                        stroke={chartColors.newUsers}
                        strokeWidth={2}
                        name="New Users" 
                      />
                      <Line 
                        type="monotone" 
                        dataKey="sessions" 
                        stroke={chartColors.sessionsToday}
                        strokeWidth={2}
                        name="Sessions" 
                      />
                    </RechartsLineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
            
            {/* Search and Filter */}
            <div className={styles.searchContainer}>
              <input 
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search users by ID..."
                className={styles.searchInput}
              />
              <button 
                className={styles.searchButton}
                onClick={() => fetchUserData()}
              >
                Refresh Data
              </button>
            </div>
            
            <div className={styles.filters}>
              <button
                className={activeFilter === 'all' ? styles.filterButtonActive : styles.filterButton}
                onClick={() => setActiveFilter('all')}
              >
                All Users
              </button>
              <button
                className={activeFilter === 'highUsage' ? styles.filterButtonActive : styles.filterButton}
                onClick={() => setActiveFilter('highUsage')}
              >
                High Usage (&gt;10K tokens)
              </button>
              <button
                className={activeFilter === 'lowUsage' ? styles.filterButtonActive : styles.filterButton}
                onClick={() => setActiveFilter('lowUsage')}
              >
                Low Usage (&le;10K tokens)
              </button>
            </div>
            
            {/* User Stats Overview */}
            <h2 className={styles.sectionTitle}>User Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <div className="bg-white rounded-lg shadow-sm p-6">
                <p className="text-sm text-gray-500">Total Users</p>
                <p className="text-2xl font-bold" style={{ color: chartColors.totalUsers }}>
                  {sessionStats?.totalUsers}
                </p>
              </div>
              
              <div className="bg-white rounded-lg shadow-sm p-6">
                <p className="text-sm text-gray-500">Active Today</p>
                <p className="text-2xl font-bold" style={{ color: chartColors.activeUsers }}>
                  {sessionStats?.activeToday}
                </p>
              </div>
              
              <div className="bg-white rounded-lg shadow-sm p-6">
                <p className="text-sm text-gray-500">Avg. Session Time</p>
                <p className="text-2xl font-bold" style={{ color: chartColors.avgSessionTime }}>
                  {Math.floor(sessionStats?.avgSessionTime / 60)}m {sessionStats?.avgSessionTime % 60}s
                </p>
              </div>
              
              <div className="bg-white rounded-lg shadow-sm p-6">
                <p className="text-sm text-gray-500">Avg. Queries / Session</p>
                <p className="text-2xl font-bold" style={{ color: chartColors.avgQueries }}>
                  {sessionStats?.avgQueriesPerSession}
                </p>
              </div>
            </div>
            
            {/* User Table */}
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h3 className={styles.cardTitle}>User Details (Last 7 Days)</h3>
              </div>
              <div className={styles.cardBody}>
                <div className="overflow-x-auto">
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th className={styles.tableHeader}>User ID</th>
                        <th className={styles.tableHeader}>Total Requests</th>
                        <th className={styles.tableHeader}>Total Tokens</th>
                        <th className={styles.tableHeader}>Total Cost</th>
                        <th className={styles.tableHeader}>Avg. Tokens / Request</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.length > 0 ? (
                        filteredUsers.map((user, index) => (
                          <tr key={index} className={styles.tableRow}>
                            <td className={styles.tableCell}>{user.user_id}</td>
                            <td className={styles.tableCell}>{user.requests.toLocaleString()}</td>
                            <td className={styles.tableCell}>{user.tokens.toLocaleString()}</td>
                            <td className={styles.tableCell}>${user.cost.toFixed(4)}</td>
                            <td className={styles.tableCell}>
                              {Math.round(user.tokens / (user.requests || 1)).toLocaleString()}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                            No users found matching your criteria
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </AnalyticsLayout>
  );
} 