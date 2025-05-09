"use client"

import { useState, useEffect } from 'react';
import AnalyticsLayout from '@/components/analytics/AnalyticsLayout';
import { 
  LineChart as RechartsLineChart, Line, BarChart as RechartsBarChart, Bar, XAxis, YAxis, 
  CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell
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
  statCard: 'bg-white rounded-lg shadow-sm p-6',
  statNumber: 'text-2xl font-bold text-[#FF7F7F]',
  statLabel: 'text-sm text-gray-500',
  infoText: 'text-sm text-gray-500 mt-2',
  dateRangeSelector: 'flex space-x-4 mb-6 text-center text-gray-500',
  dateRangeButton: 'px-3 py-1 rounded-md border border-gray-300 text-sm',
  dateRangeButtonActive: 'px-3 py-1 rounded-md border border-[#FF7F7F] bg-[#FFF0F0] text-[#FF7F7F] text-sm',
};

// Enhanced color palette
const chartColors = {
  cost: '#FF7F7F',
  projected: '#4F46E5',
  breakdown: ['#FF7F7F', '#4F46E5', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'],
  monthlyProjection: '#10B981',
  quarterlyProjection: '#F59E0B',
  yearlyProjection: '#8B5CF6',
};

export default function CostAnalysisPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [costSummary, setCostSummary] = useState<any>(null);
  const [dailyCosts, setDailyCosts] = useState<any[]>([]);
  const [modelCosts, setModelCosts] = useState<any[]>([]);
  const [dateRange, setDateRange] = useState('30d');
  const [projections, setProjections] = useState<any>(null);

  useEffect(() => {
    fetchCostData();
  }, [dateRange]);

  const fetchCostData = async () => {
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
      
      // Fetch cost summary with real-time data
      const summaryRes = await fetch(`${API_BASE_URL}/analytics/costs/summary?period=${dateRange}`, { 
        headers: { 'X-Admin-API-Key': adminKey }
      });
      
      if (!summaryRes.ok) {
        throw new Error(`Failed to fetch cost summary: ${summaryRes.status}`);
      }
      
      const summaryData = await summaryRes.json();
      setCostSummary(summaryData);
      
      // Fetch daily costs with time parameters
      const dailyRes = await fetch(`${API_BASE_URL}/analytics/costs/daily?period=${dateRange}`, { 
        headers: { 'X-Admin-API-Key': adminKey }
      });
      
      if (dailyRes.ok) {
        const dailyData = await dailyRes.json();
        setDailyCosts(dailyData.daily_costs || []);
      }
      
      // Fetch model costs with detailed breakdown
      const modelRes = await fetch(`${API_BASE_URL}/analytics/costs/models?period=${dateRange}`, { 
        headers: { 'X-Admin-API-Key': adminKey }
      });
      
      if (modelRes.ok) {
        const modelData = await modelRes.json();
        setModelCosts(modelData.model_costs || []);
      }
      
      // Fetch real cost projections
      const projectionsRes = await fetch(`${API_BASE_URL}/analytics/costs/projections`, { 
        headers: { 'X-Admin-API-Key': adminKey }
      });
      
      if (projectionsRes.ok) {
        const projectionsData = await projectionsRes.json();
        setProjections(projectionsData);
      }
      
    } catch (err: any) {
      console.error('Error loading cost data:', err);
      setError(err.message || 'Failed to load cost data');
    } finally {
      setIsLoading(false);
    }
  };

  // Add real-time cost tracker
  useEffect(() => {
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    
    // Set up polling for real-time cost updates
    const costTrackerInterval = setInterval(async () => {
      try {
        const adminKey = localStorage.getItem('adminApiKey');
        if (!adminKey) return;
        
        const todayRes = await fetch(`${API_BASE_URL}/analytics/costs/today`, { 
          headers: { 'X-Admin-API-Key': adminKey }
        });
        
        if (todayRes.ok) {
          const todayData = await todayRes.json();
          
          // Update the last data point to show real-time costs for today
          setDailyCosts(current => {
            const updated = [...current];
            const todayIndex = updated.findIndex(day => day.date === todayData.date);
            
            if (todayIndex >= 0) {
              updated[todayIndex] = todayData;
            } else if (updated.length > 0) {
              updated.push(todayData);
            }
            
            return updated;
          });
        }
      } catch (err) {
        console.error('Error fetching real-time cost data:', err);
      }
    }, 30000); // Update every 30 seconds
    
    return () => {
      clearInterval(costTrackerInterval);
    };
  }, []);

  return (
    <AnalyticsLayout title="Cost Analysis | Auto-Analyst Analytics">
      <div className={styles.container}>
        <h1 className={styles.header}>Cost Analysis</h1>
        
        {error && (
          <div className={styles.error}>{error}</div>
        )}
        
        {/* Date Range Selector */}
        <div className={styles.dateRangeSelector}>
          <button 
            className={dateRange === '7d' ? styles.dateRangeButtonActive : styles.dateRangeButton}
            onClick={() => setDateRange('7d')}
          >
            Last 7 Days
          </button>
          <button 
            className={dateRange === '30d' ? styles.dateRangeButtonActive : styles.dateRangeButton}
            onClick={() => setDateRange('30d')}
          >
            Last 30 Days
          </button>
          <button 
            className={dateRange === '90d' ? styles.dateRangeButtonActive : styles.dateRangeButton}
            onClick={() => setDateRange('90d')}
          >
            Last 90 Days
          </button>
        </div>
        
        {isLoading ? (
          <div className={styles.loading}>Loading cost analysis data...</div>
        ) : (
          <>
            {/* Cost Summary */}
            <h2 className={styles.sectionTitle}>Cost Summary</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <div className={styles.statCard}>
                <p className={styles.statLabel}>Total Cost</p>
                <p className={styles.statNumber}>${costSummary?.totalCost.toFixed(2)}</p>
                <p className={styles.infoText}>Last {costSummary?.daysInPeriod} days</p>
              </div>
              
              <div className={styles.statCard}>
                <p className={styles.statLabel}>Average Daily Cost</p>
                <p className={styles.statNumber}>${costSummary?.avgDailyCost.toFixed(2)}</p>
                <p className={styles.infoText}>(${(costSummary?.avgDailyCost * 30).toFixed(2)} / month est.)</p>
              </div>
              
              <div className={styles.statCard}>
                <p className={styles.statLabel}>Cost per 1K Tokens</p>
                <p className={styles.statNumber}>${costSummary?.costPerThousandTokens.toFixed(4)}</p>
                <p className={styles.infoText}>Average across all models</p>
              </div>
              
              <div className={styles.statCard}>
                <p className={styles.statLabel}>Most Used Model</p>
                <p className={styles.statNumber}>
                  {modelCosts.length > 0 ? modelCosts[0].model_name : 'N/A'}
                </p>
                <p className={styles.infoText}>
                  {modelCosts.length > 0 ? `$${modelCosts[0].cost.toFixed(2)}` : 'No data'}
                </p>
              </div>
            </div>
            
            {/* Daily Cost Chart */}
            <h2 className={styles.sectionTitle}>Daily Costs</h2>
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h3 className={styles.cardTitle}>Cost Trend</h3>
              </div>
              <div className={styles.cardBody}>
                <div className={styles.chartContainer}>
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsLineChart
                      data={dailyCosts}
                      margin={{ top: 10, right: 30, left: 20, bottom: 30 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip
                        formatter={(value) => [`$${Number(value).toFixed(4)}`, 'Cost']}
                      />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="cost" 
                        stroke={chartColors.cost}
                        strokeWidth={2} 
                        name="Daily Cost"
                        activeDot={{ r: 8 }}
                      />
                    </RechartsLineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
            
            {/* Cost Breakdown by Model */}
            <h2 className={styles.sectionTitle}>Cost Breakdown</h2>
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h3 className={styles.cardTitle}>Cost by Model</h3>
              </div>
              <div className={styles.cardBody}>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Pie Chart */}
                  <div className={styles.chartContainer}>
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <Pie
                          data={modelCosts}
                          dataKey="cost"
                          nameKey="model_name"
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          fill="#8884d8"
                          label={({model_name, percent}) => `${model_name}: ${(percent * 100).toFixed(1)}%`}
                        >
                          {modelCosts.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={chartColors.breakdown[index % chartColors.breakdown.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value) => [`$${Number(value).toFixed(4)}`, 'Cost']}
                        />
                        <Legend />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </div>
                  
                  {/* Bar Chart */}
                  <div className={styles.chartContainer}>
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsBarChart
                        data={modelCosts}
                        margin={{ top: 10, right: 30, left: 20, bottom: 60 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="model_name" angle={-45} textAnchor="end" height={50} />
                        <YAxis />
                        <Tooltip
                          formatter={(value) => [`$${Number(value).toFixed(4)}`, 'Cost']}
                        />
                        <Legend />
                        <Bar dataKey="cost" name="Cost">
                          {modelCosts.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={chartColors.breakdown[index % chartColors.breakdown.length]} />
                          ))}
                        </Bar>
                      </RechartsBarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Cost Projections */}
            <h2 className={styles.sectionTitle}>Cost Projections</h2>
            <div className={styles.card}>
              <div className={styles.cardHeader}>
                <h3 className={styles.cardTitle}>Projected Future Costs</h3>
              </div>
              <div className={styles.cardBody}>
                <p className={styles.infoText}>
                  Based on your current usage patterns, here are estimated future costs:
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                  <div className={styles.statCard}>
                    <p className={styles.statLabel}>Next 30 Days</p>
                    <p className={styles.statNumber} style={{ color: chartColors.monthlyProjection }}>
                      ${projections?.nextMonth.toFixed(2)}
                    </p>
                    <p className={styles.infoText}>{Math.round(projections?.tokensNextMonth).toLocaleString()} tokens</p>
                  </div>
                  
                  <div className={styles.statCard}>
                    <p className={styles.statLabel}>Next 3 Months</p>
                    <p className={styles.statNumber} style={{ color: chartColors.quarterlyProjection }}>
                      ${projections?.next3Months.toFixed(2)}
                    </p>
                    <p className={styles.infoText}>{Math.round(projections?.tokensNextMonth * 3).toLocaleString()} tokens</p>
                  </div>
                  
                  <div className={styles.statCard}>
                    <p className={styles.statLabel}>Next 12 Months</p>
                    <p className={styles.statNumber} style={{ color: chartColors.yearlyProjection }}>
                      ${projections?.nextYear.toFixed(2)}
                    </p>
                    <p className={styles.infoText}>{Math.round(projections?.tokensNextMonth * 12).toLocaleString()} tokens</p>
                  </div>
                </div>
                
                <p className={styles.infoText + " mt-4"}>
                  Note: These projections are estimates based on your current usage and may vary depending on future usage patterns.
                </p>
              </div>
            </div>
          </>
        )}
      </div>
    </AnalyticsLayout>
  );
}