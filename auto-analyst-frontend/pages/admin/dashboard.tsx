import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LineChart, BarChart, PieChart } from '@/components/admin/Charts';
import { UsageTable } from '@/components/admin/UsageTable';
import { DateRangePicker } from '@/components/admin/DateRangePicker';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ExclamationTriangleIcon, ReloadIcon } from '@radix-ui/react-icons';
import { fetchUsageSummary, fetchDailyUsage, fetchDetailedUsage } from '@/lib/api/analytics';
import AdminLayout from '@/components/admin/AdminLayout';
import { formatCurrency } from '@/lib/utils';

export default function AdminDashboard() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adminKey, setAdminKey] = useState<string>('');
  const [summary, setSummary] = useState<any>(null);
  const [dailyUsage, setDailyUsage] = useState<any[]>([]);
  const [dateRange, setDateRange] = useState({ 
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), 
    endDate: new Date() 
  });
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    // Check for admin key in localStorage
    const storedKey = localStorage.getItem('adminApiKey');
    if (storedKey) {
      setAdminKey(storedKey);
      loadDashboardData(storedKey);
    } else {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (adminKey) {
      loadDashboardData(adminKey);
    }
  }, [dateRange]);

  const loadDashboardData = async (key: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Fetch summary data
      const summaryData = await fetchUsageSummary(
        key, 
        dateRange.startDate.toISOString(),
        dateRange.endDate.toISOString()
      );
      setSummary(summaryData);
      
      // Fetch daily usage data
      const days = Math.ceil((dateRange.endDate.getTime() - dateRange.startDate.getTime()) / (1000 * 60 * 60 * 24));
      const dailyData = await fetchDailyUsage(key, days);
      setDailyUsage(dailyData.daily_usage || []);
      
      setIsLoading(false);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
      setError('Failed to load dashboard data. Please check your admin API key.');
      setIsLoading(false);
    }
  };

  const handleKeySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('adminApiKey', adminKey);
    loadDashboardData(adminKey);
  };

  const handleClearKey = () => {
    localStorage.removeItem('adminApiKey');
    setAdminKey('');
    setSummary(null);
    setDailyUsage([]);
  };

  // If no admin key is provided, show the input form
  if (!adminKey) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <Head>
          <title>Admin Dashboard - Auto Analyst</title>
        </Head>
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Admin Authentication</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleKeySubmit}>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="adminKey" className="text-sm font-medium">Admin API Key</label>
                  <input
                    id="adminKey"
                    type="password"
                    placeholder="Enter your admin API key"
                    value={adminKey}
                    onChange={(e) => setAdminKey(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    required
                  />
                </div>
                <Button type="submit" className="w-full">
                  Access Dashboard
                </Button>
              </div>
            </form>
            {error && (
              <Alert variant="destructive" className="mt-4">
                <ExclamationTriangleIcon className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <AdminLayout>
      <Head>
        <title>Admin Dashboard - Auto Analyst</title>
      </Head>
      <div className="flex flex-col space-y-4 p-4 md:p-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-2xl font-bold tracking-tight">Admin Dashboard</h1>
          <div className="flex flex-col sm:flex-row gap-2">
            <DateRangePicker
              dateRange={dateRange}
              onDateRangeChange={setDateRange}
              disabled={isLoading}
            />
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => loadDashboardData(adminKey)}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <ReloadIcon className="mr-2 h-4 w-4 animate-spin" />
                  Loading...
                </>
              ) : (
                'Refresh'
              )}
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleClearKey}
            >
              Logout
            </Button>
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <ExclamationTriangleIcon className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center h-[500px]">
            <ReloadIcon className="mr-2 h-6 w-6 animate-spin" />
            <span>Loading dashboard data...</span>
          </div>
        ) : summary ? (
          <>
            {/* Summary Cards */}
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(summary.summary.total_cost)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Tokens</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{summary.summary.total_tokens.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{summary.summary.request_count.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg. Request Time</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{summary.summary.avg_request_time_ms ? `${summary.summary.avg_request_time_ms.toFixed(0)} ms` : 'N/A'}</div>
                </CardContent>
              </Card>
            </div>

            {/* Dashboard Tabs */}
            <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab} className="space-y-4">
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="models">Models</TabsTrigger>
                <TabsTrigger value="providers">Providers</TabsTrigger>
                <TabsTrigger value="users">Users</TabsTrigger>
              </TabsList>
              
              <TabsContent value="overview" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Daily Usage</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <LineChart 
                      data={dailyUsage} 
                      xAxis="date" 
                      series={[
                        { name: 'Cost ($)', key: 'cost', color: 'var(--color-primary)' },
                      ]} 
                      height={300}
                    />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Daily Token Usage</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <BarChart 
                      data={dailyUsage} 
                      xAxis="date" 
                      series={[
                        { name: 'Tokens', key: 'tokens', color: 'var(--color-secondary)' },
                      ]} 
                      height={300}
                    />
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="models" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Model Usage Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <PieChart 
                          data={summary.model_breakdown.map((model: any) => ({
                            name: model.model_name,
                            value: model.cost
                          }))} 
                          nameKey="name"
                          dataKey="value"
                          height={250}
                          title="Cost by Model"
                        />
                      </div>
                      <div>
                        <PieChart 
                          data={summary.model_breakdown.map((model: any) => ({
                            name: model.model_name,
                            value: model.tokens
                          }))} 
                          nameKey="name"
                          dataKey="value"
                          height={250}
                          title="Tokens by Model"
                        />
                      </div>
                    </div>
                    <UsageTable 
                      data={summary.model_breakdown} 
                      columns={[
                        { header: 'Model', accessor: 'model_name' },
                        { header: 'Cost', accessor: 'cost', format: 'currency' },
                        { header: 'Tokens', accessor: 'tokens', format: 'number' },
                        { header: 'Requests', accessor: 'requests', format: 'number' },
                      ]}
                      className="mt-4"
                    />
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="providers" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Provider Usage Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <PieChart 
                          data={summary.provider_breakdown.map((provider: any) => ({
                            name: provider.provider,
                            value: provider.cost
                          }))} 
                          nameKey="name"
                          dataKey="value"
                          height={250}
                          title="Cost by Provider"
                        />
                      </div>
                      <div>
                        <PieChart 
                          data={summary.provider_breakdown.map((provider: any) => ({
                            name: provider.provider,
                            value: provider.tokens
                          }))} 
                          nameKey="name"
                          dataKey="value"
                          height={250}
                          title="Tokens by Provider"
                        />
                      </div>
                    </div>
                    <UsageTable 
                      data={summary.provider_breakdown} 
                      columns={[
                        { header: 'Provider', accessor: 'provider' },
                        { header: 'Cost', accessor: 'cost', format: 'currency' },
                        { header: 'Tokens', accessor: 'tokens', format: 'number' },
                        { header: 'Requests', accessor: 'requests', format: 'number' },
                      ]}
                      className="mt-4"
                    />
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="users" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Top Users</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <UsageTable 
                      data={summary.top_users} 
                      columns={[
                        { header: 'User ID', accessor: 'user_id' },
                        { header: 'Cost', accessor: 'cost', format: 'currency' },
                        { header: 'Tokens', accessor: 'tokens', format: 'number' },
                        { header: 'Requests', accessor: 'requests', format: 'number' },
                      ]}
                    />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        ) : (
          <div className="flex items-center justify-center h-[500px]">
            <Alert>
              <AlertTitle>No data available</AlertTitle>
              <AlertDescription>
                No usage data found for the selected date range.
              </AlertDescription>
            </Alert>
          </div>
        )}
      </div>
    </AdminLayout>
  );
} 