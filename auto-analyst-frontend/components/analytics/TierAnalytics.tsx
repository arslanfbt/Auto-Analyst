import { useState, useEffect } from 'react';
import { 
  BarChart as RechartsBarChart, Bar, XAxis, YAxis, 
  CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { MODEL_TIERS, TIER_COLORS } from '@/lib/model-registry';

// Match the app's existing styles
const styles = {
  card: 'bg-white rounded-lg shadow-md overflow-hidden mb-6',
  cardHeader: 'bg-[#FFF0F0] px-4 py-3 border-b border-gray-200',
  cardTitle: 'text-lg font-medium text-gray-800',
  cardBody: 'p-4',
  sectionTitle: 'text-xl font-semibold text-gray-700 mb-3',
  gridLayout: 'grid grid-cols-1 md:grid-cols-3 gap-4 mb-8',
  tierCard: 'bg-white rounded-lg shadow-sm p-6 border-l-4',
  statNumber: 'text-2xl font-bold',
  statLabel: 'text-sm text-gray-500',
  chartContainer: 'h-80 mb-4',
  infoText: 'text-sm text-gray-500 mt-2',
  table: 'min-w-full divide-y divide-gray-200',
  tableHeader: 'px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider',
  tableRow: 'bg-white even:bg-gray-50',
  tableCell: 'px-6 py-4 whitespace-nowrap text-sm text-gray-500',
};

// Define colors for different tiers - use the imported TIER_COLORS
const tierColors = {
  tier1: '#10B981', // Green for Basic tier
  tier2: '#3B82F6', // Blue for Standard tier
  tier3: '#8B5CF6', // Purple for Premium tier
};

export default function TierAnalytics({ adminKey }: { adminKey: string }) {
  const [tierData, setTierData] = useState<any>(null);
  const [projections, setProjections] = useState<any>(null);
  const [efficiencyData, setEfficiencyData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState('30d');
  const [tierDefinitions, setTierDefinitions] = useState<any>(MODEL_TIERS);

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  const fetchTierData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch tier usage data
      const tierRes = await fetch(`${API_BASE_URL}/analytics/tiers/usage?period=${selectedPeriod}`, {
        headers: { 'X-Admin-API-Key': adminKey }
      });

      // Fetch tier projections
      const projRes = await fetch(`${API_BASE_URL}/analytics/tiers/projections`, {
        headers: { 'X-Admin-API-Key': adminKey }
      });

      // Fetch tier efficiency metrics
      const effRes = await fetch(`${API_BASE_URL}/analytics/tiers/efficiency?period=${selectedPeriod}`, {
        headers: { 'X-Admin-API-Key': adminKey }
      });

      if (!tierRes.ok) {
        throw new Error(`Failed to fetch tier data: ${tierRes.status}`);
      }

      const tierUsage = await tierRes.json();
      setTierData(tierUsage.tier_data);

      if (projRes.ok) {
        const projData = await projRes.json();
        setProjections(projData);
        
        // Also set the tier definitions from the projections response
        if (projData.tier_definitions) {
          setTierDefinitions(projData.tier_definitions);
        }
      }

      if (effRes.ok) {
        const effData = await effRes.json();
        setEfficiencyData(effData);
      }
    } catch (err: any) {
      console.error('Error loading tier data:', err);
      setError(err.message || 'Failed to load tier analytics data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (adminKey) {
      fetchTierData();
    }
  }, [adminKey, selectedPeriod]);

  // Format data for charts
  const prepareTierBarData = () => {
    if (!tierData) return [];
    
    return Object.entries(tierData).map(([tierId, data]: [string, any]) => ({
      name: data.name,
      tokens: data.total_tokens,
      requests: data.total_requests,
      cost: parseFloat(data.total_cost.toFixed(6)),
      credits: data.total_credit_cost,
      tier: tierId,
    }));
  };

  const prepareTierPieData = () => {
    if (!tierData) return [];
    
    return Object.entries(tierData)
      .map(([tierId, data]: [string, any]) => ({
        name: `${data.name} Tier`,
        value: data.total_tokens,
        tier: tierId
      }))
      .filter(item => item.value > 0);
  };

  const formatNumber = (num: number) => {
    return num >= 1000000
      ? `${(num / 1000000).toFixed(2)}M`
      : num >= 1000
      ? `${(num / 1000).toFixed(2)}K`
      : num.toFixed(2);
  };

  if (isLoading) {
    return <div className="text-center p-4">Loading tier analytics...</div>;
  }

  if (error) {
    return <div className="bg-red-50 text-red-600 p-4 rounded-md mb-4">{error}</div>;
  }

  return (
  
    <div>
      <h2 className={styles.sectionTitle}>Model Tier Analytics</h2>
      
      {/* Models by Tier */}
      {tierData && (
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>Models by Tier</h3>
          </div>
          <div className={styles.cardBody}>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {Object.entries(tierDefinitions).map(([tierId, tierInfo]: [string, any]) => (
                <div key={tierId} className="border rounded-lg p-4" style={{ borderColor: tierColors[tierId as keyof typeof tierColors] }}>
                  <h4 className="font-medium text-lg mb-2" style={{ color: tierColors[tierId as keyof typeof tierColors] }}>
                    {tierInfo.name} Tier ({tierInfo.credits} credit{tierInfo.credits > 1 ? 's' : ''})
                  </h4>
                  <div className="max-h-60 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-pink-400 scrollbar-track-gray-200">
                    <ul className="space-y-1 text-sm">
                      {tierInfo.models.map((model: string, index: number) => (
                        <li key={index} className="text-gray-700">
                          • {model}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Period selector */}
      <div className="mb-4 flex space-x-2">
        <button 
          onClick={() => setSelectedPeriod('7d')}
          className={`px-3 py-1 rounded-md ${selectedPeriod === '7d' 
            ? 'bg-[#FF7F7F] text-white' 
            : 'bg-gray-200 text-gray-700'}`}
        >
          7 Days
        </button>
        <button 
          onClick={() => setSelectedPeriod('30d')}
          className={`px-3 py-1 rounded-md ${selectedPeriod === '30d' 
            ? 'bg-[#FF7F7F] text-white' 
            : 'bg-gray-200 text-gray-700'}`}
        >
          30 Days
        </button>
        <button 
          onClick={() => setSelectedPeriod('90d')}
          className={`px-3 py-1 rounded-md ${selectedPeriod === '90d' 
            ? 'bg-[#FF7F7F] text-white' 
            : 'bg-gray-200 text-gray-700'}`}
        >
          90 Days
        </button>
      </div>

      {/* Tier Cards */}
      <div className={styles.gridLayout}>
        {tierData && Object.entries(tierData).map(([tierId, data]: [string, any]) => (
          <div 
            key={tierId} 
            className={styles.tierCard}
            style={{ borderLeftColor: tierColors[tierId as keyof typeof tierColors] }}
          >
            <div className="flex justify-between items-center mb-2">
              <p className={styles.statLabel}>{data.name} Tier</p>
              <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded-md text-xs font-medium">
                {data.credits} {data.credits === 1 ? 'credit' : 'credits'}/request
              </span>
            </div>
            <p className={styles.statNumber} style={{ color: tierColors[tierId as keyof typeof tierColors] }}>
              {formatNumber(data.total_tokens)} tokens
            </p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <div>
                <p className="text-sm font-medium text-black">${data.total_cost.toFixed(6)}</p>
                <p className="text-xs text-gray-500">Total Cost</p>
              </div>
              <div>
                <p className="text-sm font-medium text-black">{data.total_requests.toLocaleString()}</p>
                <p className="text-xs text-gray-500">Requests</p>
              </div>
              <div>
                <p className="text-sm font-medium text-black">${data.cost_per_1k_tokens.toFixed(6)}</p>
                <p className="text-xs text-gray-500">Per 1K Tokens</p>
              </div>
              <div>
                <p className="text-sm font-medium text-black">${data.cost_per_credit.toFixed(6)}</p>
                <p className="text-xs text-gray-500">Per Credit</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Tier Usage Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Bar Chart */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>Tier Usage Comparison</h3>
          </div>
          <div className={styles.cardBody}>
            <div className={styles.chartContainer}>
              <ResponsiveContainer width="100%" height="100%">
                <RechartsBarChart data={prepareTierBarData()} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value, name) => {
                      if (name === 'tokens') return [value.toLocaleString(), 'Tokens'];
                      if (name === 'cost') return [`$${Number(value).toFixed(6)}`, 'Cost'];
                      if (name === 'credits') return [value.toLocaleString(), 'Credits'];
                      return [value, name];
                    }}
                  />
                  <Legend />
                  <Bar dataKey="tokens" name="Tokens" fill="#FF7F7F" />
                  <Bar dataKey="cost" name="Cost ($)" fill="#4F46E5" />
                  <Bar dataKey="credits" name="Credits Used" fill="#10B981" />
                </RechartsBarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Pie Chart */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>Token Distribution by Tier</h3>
          </div>
          <div className={styles.cardBody}>
            <div style={{ height: '300px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={prepareTierPieData()}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => percent > 0.05 ? `${name}: ${(percent * 100).toFixed(0)}%` : ''}
                    outerRadius={90}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {prepareTierPieData().map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={tierColors[entry.tier as keyof typeof tierColors]} 
                      />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => {
                      // Calculate the percentage
                      const total = prepareTierPieData().reduce((sum, item) => sum + item.value, 0);
                      const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : '0.0';
                      
                      // Return a nicely formatted string
                      return [`${value.toLocaleString()} tokens (${percentage}%)`];
                    }}
                    contentStyle={{ 
                      backgroundColor: 'white', 
                      borderRadius: '4px', 
                      padding: '10px', 
                      fontSize: '13px', 
                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                      border: '1px solid #eee'
                    }}
                  />
                  <Legend 
                    layout="vertical" 
                    verticalAlign="middle" 
                    align="right"
                    formatter={(value) => <span style={{ fontSize: '14px', fontWeight: 'bold' }}>{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Efficiency Metrics */}
      {efficiencyData && (
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>Tier Efficiency Metrics</h3>
          </div>
          <div className={styles.cardBody}>
            <div className="overflow-x-auto">
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th className={styles.tableHeader}>Tier</th>
                    <th className={styles.tableHeader}>Tokens/Credit</th>
                    <th className={styles.tableHeader}>Cost/Credit</th>
                    <th className={styles.tableHeader}>Avg Tokens/Query</th>
                    <th className={styles.tableHeader}>Cost/1K Tokens</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(efficiencyData.efficiency_data).map(([tierId, data]: [string, any]) => (
                    <tr key={tierId} className={styles.tableRow}>
                      <td className={styles.tableCell}>
                        <span className="font-medium" style={{ color: tierColors[tierId as keyof typeof tierColors] }}>
                          {data.name}
                        </span>
                      </td>
                      <td className={styles.tableCell}>{formatNumber(data.tokens_per_credit)}</td>
                      <td className={styles.tableCell}>${data.cost_per_credit.toFixed(6)}</td>
                      <td className={styles.tableCell}>{formatNumber(data.avg_tokens_per_query)}</td>
                      <td className={styles.tableCell}>${data.cost_per_1k_tokens.toFixed(6)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="mt-4 p-3 bg-gray-50 rounded-md">
              <p className="text-sm text-gray-900">
                <span className="font-bold text-green-500">Most Efficient Tier:</span>{' '}
                <span style={{ color: tierColors[efficiencyData.most_efficient_tier as keyof typeof tierColors] }} className="text-gray-900">
                  {efficiencyData.efficiency_data[efficiencyData.most_efficient_tier]?.name || 'N/A'}
                </span> 
                {' '}(highest tokens per credit)
              </p>
              <p className="text-sm mt-1 text-gray-900">
                <span className="font-bold text-green-500">Best Value Tier:</span>{' '}
                <span style={{ color: tierColors[efficiencyData.best_value_tier as keyof typeof tierColors] }} className="text-gray-900">
                  {efficiencyData.efficiency_data[efficiencyData.best_value_tier]?.name || 'N/A'}
                </span>
                {' '}(lowest cost per credit)
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Projections */}
      {projections && (
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h3 className={styles.cardTitle}>Future Cost Projections</h3>
          </div>
          <div className={styles.cardBody}>
            <div className="overflow-x-auto">
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th className={styles.tableHeader}>Time Period</th>
                    <th className={styles.tableHeader}>Total Tokens</th>
                    <th className={styles.tableHeader}>Total Cost</th>
                    <th className={styles.tableHeader}>Total Credits</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className={styles.tableRow}>
                    <td className={`${styles.tableCell} font-medium`}>Monthly (Next 30 days)</td>
                    <td className={styles.tableCell}>
                      {formatNumber(projections.projections.monthly.total_tokens)}
                    </td>
                    <td className={styles.tableCell}>
                      ${projections.projections.monthly.total_cost.toFixed(6)}
                    </td>
                    <td className={styles.tableCell}>
                      {Math.round(projections.projections.monthly.total_credits).toLocaleString()}
                    </td>
                  </tr>
                  <tr className={styles.tableRow}>
                    <td className={`${styles.tableCell} font-medium`}>Quarterly (Next 90 days)</td>
                    <td className={styles.tableCell}>
                      {formatNumber(projections.projections.quarterly.total_tokens)}
                    </td>
                    <td className={styles.tableCell}>
                      ${projections.projections.quarterly.total_cost.toFixed(6)}
                    </td>
                    <td className={styles.tableCell}>
                      {Math.round(projections.projections.quarterly.total_credits).toLocaleString()}
                    </td>
                  </tr>
                  <tr className={styles.tableRow}>
                    <td className={`${styles.tableCell} font-medium`}>Yearly (Next 365 days)</td>
                    <td className={styles.tableCell}>
                      {formatNumber(projections.projections.yearly.total_tokens)}
                    </td>
                    <td className={styles.tableCell}>
                      ${projections.projections.yearly.total_cost.toFixed(6)}
                    </td>
                    <td className={styles.tableCell}>
                      {Math.round(projections.projections.yearly.total_credits).toLocaleString()}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className={styles.infoText}>
              Projections based on the last 30 days of usage data. Actual usage may vary.
            </p>
          </div>
        </div>
      )}
    </div>
  );
} 