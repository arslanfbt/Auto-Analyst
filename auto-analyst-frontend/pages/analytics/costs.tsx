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

// Color palette for charts
const COLORS = ['#FF7F7F', '#FF6666', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

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
      
      // Get days based on selected range
      let days = 30;
      if (dateRange === '7d') days = 7;
      if (dateRange === '90d') days = 90;
      
      // Fetch daily cost data
      const dailyRes = await fetch(`${API_BASE_URL}/analytics/daily?days=${days}`, { 
        headers: { 'X-Admin-API-Key': adminKey }
      });
      
      if (!dailyRes.ok) {
        throw new Error(`Failed to fetch cost data: ${dailyRes.status}`);
      }
      
      const dailyData = await dailyRes.json();
      setDailyCosts(dailyData.daily_usage || []);
      
      // Calculate cost summary from daily data
      const totalCost = dailyData.daily_usage?.reduce((sum: number, day: any) => sum + day.cost, 0) || 0;
      const avgDailyCost = totalCost / days;
      
      setCostSummary({
        totalCost,
        avgDailyCost,
        daysInPeriod: days,
        costPerThousandTokens: totalCost / (dailyData.daily_usage?.reduce((sum: number, day: any) => sum + day.tokens, 0) || 1) * 1000,
      });
      
      // Fetch model breakdown
      const modelRes = await fetch(`${API_BASE_URL}/analytics/usage/models`, { 
        headers: { 'X-Admin-API-Key': adminKey }
      });
      
      if (modelRes.ok) {
        const modelData = await modelRes.json();
        setModelCosts(modelData.model_usage || []);
      }
      
      // Calculate projections
      const tokensPerDay = dailyData.daily_usage?.reduce((sum: number, day: any) => sum + day.tokens, 0) / days || 0;
      const costPerDay = avgDailyCost;
      
      setProjections({
        nextMonth: costPerDay * 30,
        next3Months: costPerDay * 90,
        nextYear: costPerDay * 365,
        tokensNextMonth: tokensPerDay * 30,
      });
      
    } catch (err: any) {
      console.error('Error loading cost data:', err);
      setError(err.message || 'Failed to load cost analysis data');
    } finally {
      setIsLoading(false);
    }
  };

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
                        stroke="#FF7F7F" 
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
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
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
                        <Bar dataKey="cost" fill="#FF7F7F" name="Cost" />
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
                    <p className={styles.statNumber}>${projections?.nextMonth.toFixed(2)}</p>
                    <p className={styles.infoText}>{Math.round(projections?.tokensNextMonth).toLocaleString()} tokens</p>
                  </div>
                  
                  <div className={styles.statCard}>
                    <p className={styles.statLabel}>Next 3 Months</p>
                    <p className={styles.statNumber}>${projections?.next3Months.toFixed(2)}</p>
                    <p className={styles.infoText}>{Math.round(projections?.tokensNextMonth * 3).toLocaleString()} tokens</p>
                  </div>
                  
                  <div className={styles.statCard}>
                    <p className={styles.statLabel}>Next 12 Months</p>
                    <p className={styles.statNumber}>${projections?.nextYear.toFixed(2)}</p>
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