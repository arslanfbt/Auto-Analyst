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
  searchContainer: 'flex gap-4 mb-6',
  searchInput: 'flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#FF7F7F]',
  searchButton: 'bg-[#FF7F7F] text-white px-4 py-2 rounded-md hover:bg-[#FF6666] transition shadow-md',
  filters: 'flex flex-wrap gap-4 mb-6',
  filterButton: 'px-3 py-1 rounded-md border border-gray-300 text-sm',
  filterButtonActive: 'px-3 py-1 rounded-md border border-[#FF7F7F] bg-[#FFF0F0] text-[#FF7F7F] text-sm',
};

export default function UserActivityPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [userActivity, setUserActivity] = useState<any[]>([]);
  const [sessionStats, setSessionStats] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');


  useEffect(() => {
    fetchUserData();
  }, []);

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
      
      // Fetch analytics summary which should include top users
      const summaryRes = await fetch(`${API_BASE_URL}/analytics/usage/summary`, { 
        headers: { 'X-Admin-API-Key': adminKey }
      });
      
      if (!summaryRes.ok) {
        throw new Error(`Failed to fetch user data: ${summaryRes.status}`);
      }
      
      const summaryData = await summaryRes.json();
      setUsers(summaryData.top_users || []);
      
      // Simulate user activity over time (would need server endpoint)
      // This would typically show user engagement metrics over time
      const lastMonth = Array(30).fill(0).map((_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (29 - i));
        return {
          date: date.toISOString().split('T')[0],
          activeUsers: Math.floor(Math.random() * 15) + 5,
          newUsers: Math.floor(Math.random() * 3) + 1,
          sessions: Math.floor(Math.random() * 30) + 20,
        };
      });
      
      setUserActivity(lastMonth);
      
      // Simulate session statistics
      setSessionStats({
        totalUsers: summaryData.total_users || 25,
        activeToday: Math.floor(Math.random() * 10) + 5,
        avgSessionTime: Math.floor(Math.random() * 600) + 120,
        avgQueriesPerSession: Math.floor(Math.random() * 8) + 3,
      });
      
    } catch (err: any) {
      console.error('Error loading user data:', err);
      setError(err.message || 'Failed to load user activity data');
    } finally {
      setIsLoading(false);
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
                        stroke="#FF7F7F" 
                        name="Active Users"
                        activeDot={{ r: 8 }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="newUsers" 
                        stroke="#FF6666" 
                        name="New Users" 
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
                Low Usage (&leq;10K tokens)
              </button>
            </div>
            
            {/* User Stats Overview */}
            <h2 className={styles.sectionTitle}>User Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <div className="bg-white rounded-lg shadow-sm p-6">
                <p className="text-sm text-gray-500">Total Users</p>
                <p className="text-2xl font-bold text-blue-600">{sessionStats?.totalUsers}</p>
              </div>
              
              <div className="bg-white rounded-lg shadow-sm p-6">
                <p className="text-sm text-gray-500">Active Today</p>
                <p className="text-2xl font-bold text-blue-600">{sessionStats?.activeToday}</p>
              </div>
              
              <div className="bg-white rounded-lg shadow-sm p-6">
                <p className="text-sm text-gray-500">Avg. Session Time</p>
                <p className="text-2xl font-bold text-blue-600">{Math.floor(sessionStats?.avgSessionTime / 60)}m {sessionStats?.avgSessionTime % 60}s</p>
              </div>
              
              <div className="bg-white rounded-lg shadow-sm p-6">
                <p className="text-sm text-gray-500">Avg. Queries / Session</p>
                <p className="text-2xl font-bold text-blue-600">{sessionStats?.avgQueriesPerSession}</p>
              </div>
            </div>
            
            {/* User Table */}
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h3 className={styles.cardTitle}>User Details</h3>
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