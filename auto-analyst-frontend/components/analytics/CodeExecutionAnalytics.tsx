"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts'
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { 
  fetchCodeExecutionSummary, 
  fetchDetailedCodeExecutions,
  fetchUserCodeExecutionStats,
  fetchErrorAnalysis 
} from '@/lib/api/analytics'

export default function CodeExecutionAnalytics() {
  const router = useRouter()
  const [adminKey, setAdminKey] = useState<string>('')
  const [period, setPeriod] = useState<string>('30d')
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  
  // State for different data types
  const [summaryData, setSummaryData] = useState<any>(null)
  const [detailedExecutions, setDetailedExecutions] = useState<any[]>([])
  const [userStats, setUserStats] = useState<any[]>([])
  const [errorAnalysis, setErrorAnalysis] = useState<any>(null)
  
  // Colors for charts
  const COLORS = ['#FF7F7F', '#FFB382', '#FFEA80', '#A9E5BB', '#8FC1E3', '#B19CD9', '#FF99C8']
  
  useEffect(() => {
    // Get the admin key from local storage
    const storedKey = localStorage.getItem('adminApiKey')
    if (!storedKey) {
      router.push('/analytics/')
      return
    }
    
    setAdminKey(storedKey)
    
    // Initial data fetch
    fetchData(storedKey, period)
  }, [router, period])
  
  const fetchData = async (key: string, selectedPeriod: string) => {
    setLoading(true)
    setError(null)
    
    try {
      // Fetch all data in parallel
      const [summary, executions, stats, errors] = await Promise.all([
        fetchCodeExecutionSummary(key, selectedPeriod),
        fetchDetailedCodeExecutions(key, selectedPeriod),
        fetchUserCodeExecutionStats(key, selectedPeriod),
        fetchErrorAnalysis(key, selectedPeriod)
      ])
      
      setSummaryData(summary)
      setDetailedExecutions(executions.executions || [])
      setUserStats(stats.users || [])
      setErrorAnalysis(errors)
      
      setLoading(false)
    } catch (err) {
      console.error('Error fetching analytics data:', err)
      setError('Failed to fetch analytics data. Please check your API key or try again later.')
      setLoading(false)
    }
  }
  
  const handlePeriodChange = (value: string) => {
    setPeriod(value)
    fetchData(adminKey, value)
  }
  
  // Render loading skeleton
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Code Execution Analytics</h1>
          <Skeleton className="h-10 w-32" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="col-span-1">
              <CardHeader>
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
        
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-1/3" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    )
  }
  
  // Render error state
  if (error) {
    return (
      <Alert variant="destructive" className="mb-4">
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          {error}
          <Button 
            variant="outline" 
            className="mt-2"
            onClick={() => fetchData(adminKey, period)}
          >
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    )
  }
  
  // Format data for summary stats chart
  const formatSummaryChartData = () => {
    if (!summaryData) return []
    
    return [
      { name: 'Successful', value: summaryData.overall_stats.successful_executions },
      { name: 'Failed', value: summaryData.overall_stats.total_executions - summaryData.overall_stats.successful_executions }
    ]
  }
  
  // Format data for model performance chart
  const formatModelPerformanceData = () => {
    if (!summaryData?.model_performance) return []
    
    return summaryData.model_performance.map((model: any) => ({
      name: model.model_name,
      success: model.successful_executions,
      failure: model.total_executions - model.successful_executions,
      successRate: (model.success_rate * 100).toFixed(1)
    }))
  }
  
  // Format data for agent failures chart
  const formatAgentFailureData = () => {
    if (!summaryData?.failed_agents) return []
    
    return summaryData.failed_agents.slice(0, 7).map((agent: any) => ({
      name: agent.agent_name,
      value: agent.failure_count
    }))
  }
  
  // Format data for error types chart
  const formatErrorTypesData = () => {
    if (!errorAnalysis?.error_types) return []
    
    return errorAnalysis.error_types.slice(0, 7).map((error: any) => ({
      name: error.error_type,
      value: error.count
    }))
  }
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Code Execution Analytics</h1>
        
        <Select value={period} onValueChange={handlePeriodChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select timeframe" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      {/* Summary Cards */}
      {summaryData && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Total Executions</CardTitle>
              <CardDescription>Code execution attempts</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold">{summaryData.overall_stats.total_executions}</div>
              <div className="text-sm text-gray-500 mt-2">
                By {summaryData.overall_stats.total_users} users across {summaryData.overall_stats.total_chats} chats
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Success Rate</CardTitle>
              <CardDescription>Execution success percentage</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold">{(summaryData.overall_stats.success_rate * 100).toFixed(1)}%</div>
              <div className="text-sm text-gray-500 mt-2">
                {summaryData.overall_stats.successful_executions} successful, {summaryData.overall_stats.failed_executions} failed
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Date Range</CardTitle>
              <CardDescription>Period analyzed</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-medium">{summaryData.start_date} to {summaryData.end_date}</div>
              <div className="text-sm text-gray-500 mt-2">
                Based on {period === '7d' ? '7 days' : period === '30d' ? '30 days' : '90 days'} of data
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      
      {/* Main Content Tabs */}
      <Tabs defaultValue="overview">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="agents">Agent Analysis</TabsTrigger>
          <TabsTrigger value="errors">Error Patterns</TabsTrigger>
          <TabsTrigger value="models">Model Performance</TabsTrigger>
        </TabsList>
        
        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Execution Success vs Failure</CardTitle>
                <CardDescription>Overall success rate of code executions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={formatSummaryChartData()}
                        cx="50%"
                        cy="50%"
                        innerRadius={80}
                        outerRadius={120}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                      >
                        {formatSummaryChartData().map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={index === 0 ? '#4CAF50' : '#FF5252'} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [`${value} executions`, '']} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Top Active Users</CardTitle>
                <CardDescription>Users with most code executions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80 overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User ID</TableHead>
                        <TableHead>Executions</TableHead>
                        <TableHead>Success Rate</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {userStats.slice(0, 8).map((user) => (
                        <TableRow key={user.user_id}>
                          <TableCell className="font-medium">{user.user_id}</TableCell>
                          <TableCell>{user.total_executions}</TableCell>
                          <TableCell>
                            <Badge variant={user.success_rate > 0.8 ? "default" : user.success_rate > 0.5 ? "secondary" : "destructive"}>
                              {(user.success_rate * 100).toFixed(1)}%
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Recent Code Executions</CardTitle>
              <CardDescription>Latest code execution attempts</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Model</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Failed Agents</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detailedExecutions.slice(0, 10).map((execution) => (
                      <TableRow key={execution.execution_id}>
                        <TableCell className="font-medium">
                          {new Date(execution.created_at).toLocaleString()}
                        </TableCell>
                        <TableCell>{execution.user_id || 'Anonymous'}</TableCell>
                        <TableCell>{execution.model_info.name || 'Unknown'}</TableCell>
                        <TableCell>
                          <Badge variant={execution.is_successful ? "default" : "destructive"}>
                            {execution.is_successful ? 'Success' : 'Failed'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {execution.failed_agents && execution.failed_agents.length > 0 
                            ? execution.failed_agents.join(', ')
                            : execution.is_successful ? 'None' : 'Unknown'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Agent Analysis Tab */}
        <TabsContent value="agents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Agent Failure Distribution</CardTitle>
              <CardDescription>Most frequently failing agents</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={formatAgentFailureData()}
                    margin={{ top: 20, right: 30, left: 20, bottom: 50 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                    <YAxis />
                    <Tooltip formatter={(value) => [`${value} failures`, 'Count']} />
                    <Bar dataKey="value" fill="#FF7F7F" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          
          {errorAnalysis && errorAnalysis.error_by_agent && (
            <Card>
              <CardHeader>
                <CardTitle>Error Types by Agent</CardTitle>
                <CardDescription>Common error patterns per agent</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {errorAnalysis.error_by_agent.slice(0, 5).map((agentData: any) => (
                    <div key={agentData.agent_name} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <h3 className="font-medium">{agentData.agent_name}</h3>
                        <Badge variant="outline">{agentData.error_count} errors</Badge>
                      </div>
                      
                      <div className="bg-gray-50 p-3 rounded-md">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Error Type</TableHead>
                              <TableHead>Count</TableHead>
                              <TableHead>Percentage</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {agentData.common_errors.slice(0, 5).map((error: any) => (
                              <TableRow key={error.error_type}>
                                <TableCell className="font-medium">{error.error_type}</TableCell>
                                <TableCell>{error.count}</TableCell>
                                <TableCell>
                                  {((error.count / agentData.error_count) * 100).toFixed(1)}%
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        {/* Error Patterns Tab */}
        <TabsContent value="errors" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Most Common Error Types</CardTitle>
              <CardDescription>Frequency of different error categories</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={formatErrorTypesData()}
                      cx="50%"
                      cy="50%"
                      outerRadius={120}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                    >
                      {formatErrorTypesData().map((entry: { name: string; value: number }, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`${value} occurrences`, '']} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          
          {errorAnalysis && (
            <Card>
              <CardHeader>
                <CardTitle>Detailed Error Analysis</CardTitle>
                <CardDescription>Breakdown of error occurrences</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Error Type</TableHead>
                      <TableHead>Count</TableHead>
                      <TableHead>Percentage</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {errorAnalysis.error_types.map((error: any) => (
                      <TableRow key={error.error_type}>
                        <TableCell className="font-medium">{error.error_type}</TableCell>
                        <TableCell>{error.count}</TableCell>
                        <TableCell>
                          {((error.count / errorAnalysis.total_failed_executions) * 100).toFixed(1)}%
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        {/* Model Performance Tab */}
        <TabsContent value="models" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Model Success Rates</CardTitle>
              <CardDescription>Execution success by model</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={formatModelPerformanceData()}
                    margin={{ top: 20, right: 30, left: 20, bottom: 50 }}
                    barGap={0}
                    barCategoryGap="20%"
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="success" stackId="a" fill="#4CAF50" name="Successful" />
                    <Bar dataKey="failure" stackId="a" fill="#FF5252" name="Failed" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Model Comparison</CardTitle>
              <CardDescription>Performance metrics by model</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Model</TableHead>
                    <TableHead>Success Rate</TableHead>
                    <TableHead>Total Executions</TableHead>
                    <TableHead>User Count</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summaryData?.model_performance.map((model: any) => (
                    <TableRow key={model.model_name}>
                      <TableCell className="font-medium">{model.model_name}</TableCell>
                      <TableCell>
                        <Badge variant={
                          model.success_rate > 0.8 ? "default" : 
                          model.success_rate > 0.5 ? "secondary" : 
                          "destructive"
                        }>
                          {(model.success_rate * 100).toFixed(1)}%
                        </Badge>
                      </TableCell>
                      <TableCell>{model.total_executions}</TableCell>
                      <TableCell>{model.user_count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
} 