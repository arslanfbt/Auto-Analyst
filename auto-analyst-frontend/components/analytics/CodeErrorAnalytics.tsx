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
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table"
import { 
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
  Cell,
  Treemap
} from 'recharts'
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  fetchDetailedCodeExecutions,
  fetchErrorAnalysis 
} from '@/lib/api/analytics'

export default function CodeErrorAnalytics() {
  const router = useRouter()
  const [adminKey, setAdminKey] = useState<string>('')
  const [period, setPeriod] = useState<string>('30d')
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  
  // State for different data types
  const [detailedExecutions, setDetailedExecutions] = useState<any[]>([])
  const [errorAnalysis, setErrorAnalysis] = useState<any>(null)
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [filteredExecutions, setFilteredExecutions] = useState<any[]>([])
  
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
  
  useEffect(() => {
    // Filter executions based on search term
    if (searchTerm.trim() === '') {
      setFilteredExecutions(detailedExecutions)
    } else {
      const term = searchTerm.toLowerCase()
      const filtered = detailedExecutions.filter(execution => {
        // Search in error messages
        const hasErrorMatch = execution.error_messages && 
          Object.values(execution.error_messages).some((msg: any) => 
            msg && typeof msg === 'string' && msg.toLowerCase().includes(term)
          )
        
        // Search in failed agents
        const hasAgentMatch = execution.failed_agents && 
          execution.failed_agents.some((agent: string) => 
            agent.toLowerCase().includes(term)
          )
          
        // Search in user ID, model name, etc.
        const hasMetadataMatch = 
          (execution.user_id && execution.user_id.toString().includes(term)) ||
          (execution.model_info.name && execution.model_info.name.toLowerCase().includes(term))
          
        return hasErrorMatch || hasAgentMatch || hasMetadataMatch
      })
      
      setFilteredExecutions(filtered)
    }
  }, [searchTerm, detailedExecutions])
  
  const fetchData = async (key: string, selectedPeriod: string) => {
    setLoading(true)
    setError(null)
    
    try {
      // Only fetch error-related data
      const [executions, errors] = await Promise.all([
        fetchDetailedCodeExecutions(key, selectedPeriod, false), // Only fetch failed executions
        fetchErrorAnalysis(key, selectedPeriod)
      ])
      
      setDetailedExecutions(executions.executions || [])
      setFilteredExecutions(executions.executions || [])
      setErrorAnalysis(errors)
      
      setLoading(false)
    } catch (err) {
      console.error('Error fetching error analytics data:', err)
      setError('Failed to fetch error analytics data. Please check your API key or try again later.')
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
          <h1 className="text-2xl font-bold">Code Error Analytics</h1>
          <Skeleton className="h-10 w-32" />
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
  
  // Format data for error types chart
  const formatErrorTypesData = () => {
    if (!errorAnalysis?.error_types) return []
    
    return errorAnalysis.error_types.slice(0, 10).map((error: any) => ({
      name: error.error_type,
      value: error.count
    }))
  }
  
  // Format data for treemap of error patterns
  const formatErrorTreemapData = () => {
    if (!errorAnalysis?.error_by_agent) return []
    
    const formattedData: any[] = []
    
    errorAnalysis.error_by_agent.forEach((agent: any) => {
      const children = agent.common_errors.map((error: any) => ({
        name: error.error_type,
        value: error.count,
        agent: agent.agent_name
      }))
      
      formattedData.push({
        name: agent.agent_name,
        children
      })
    })
    
    return [{ name: 'Errors by Agent', children: formattedData }]
  }
  
  // Get an array of all unique error types across all agents
  const getAllErrorTypes = () => {
    if (!errorAnalysis?.error_by_agent) return []
    
    const errorTypes = new Set<string>()
    
    errorAnalysis.error_by_agent.forEach((agent: any) => {
      agent.common_errors.forEach((error: any) => {
        errorTypes.add(error.error_type)
      })
    })
    
    return Array.from(errorTypes)
  }
  
  // Format data for a comparison matrix of agents vs error types
  const formatErrorMatrixData = () => {
    if (!errorAnalysis?.error_by_agent) return []
    
    const errorTypes = getAllErrorTypes()
    const result: any[] = []
    
    errorAnalysis.error_by_agent.forEach((agent: any) => {
      const agentData: any = {
        agent: agent.agent_name,
        totalErrors: agent.error_count
      }
      
      // Create a map for quick lookup of error counts
      const errorMap = new Map()
      agent.common_errors.forEach((error: any) => {
        errorMap.set(error.error_type, error.count)
      })
      
      // Add count for each error type
      errorTypes.forEach(errorType => {
        agentData[errorType] = errorMap.get(errorType) || 0
      })
      
      result.push(agentData)
    })
    
    return result
  }
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Code Error Analytics</h1>
        
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
      
      {/* Summary Card */}
      {errorAnalysis && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Error Analysis Period</CardTitle>
            <CardDescription>{errorAnalysis.start_date} to {errorAnalysis.end_date}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{errorAnalysis.total_failed_executions}</div>
            <div className="text-sm text-gray-500 mt-2">
              Failed code executions analyzed
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Main Content Tabs */}
      <Tabs defaultValue="overview">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="overview">Error Overview</TabsTrigger>
          <TabsTrigger value="agents">Agent Failures</TabsTrigger>
          <TabsTrigger value="patterns">Error Patterns</TabsTrigger>
          <TabsTrigger value="failed">Failed Executions</TabsTrigger>
        </TabsList>
        
        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Common Error Types</CardTitle>
                <CardDescription>Distribution of error categories</CardDescription>
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
            
            <Card>
              <CardHeader>
                <CardTitle>Error Frequency</CardTitle>
                <CardDescription>Top error types by frequency</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={formatErrorTypesData()}
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 90, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis 
                        type="category" 
                        dataKey="name" 
                        width={80}
                      />
                      <Tooltip formatter={(value) => [`${value} occurrences`, 'Count']} />
                      <Bar dataKey="value" fill="#FF7F7F" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Detailed Error Type Analysis</CardTitle>
              <CardDescription>Complete error type breakdown</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Error Type</TableHead>
                    <TableHead>Count</TableHead>
                    <TableHead>Percentage</TableHead>
                    <TableHead>Description</TableHead>
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
                      <TableCell>
                        {getErrorTypeDescription(error.error_type)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Agent Failures Tab */}
        <TabsContent value="agents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Agent Failure Distribution</CardTitle>
              <CardDescription>Error counts per agent</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={errorAnalysis.error_by_agent.map((agent: any) => ({
                      name: agent.agent_name,
                      value: agent.error_count
                    }))}
                    margin={{ top: 20, right: 30, left: 20, bottom: 50 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                    <YAxis />
                    <Tooltip formatter={(value) => [`${value} errors`, 'Count']} />
                    <Bar dataKey="value" fill="#FF7F7F" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Error Types by Agent</CardTitle>
              <CardDescription>Error type distribution per agent</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Agent</TableHead>
                      <TableHead>Total Errors</TableHead>
                      {getAllErrorTypes().map(errorType => (
                        <TableHead key={errorType}>{errorType}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {formatErrorMatrixData().map((row: any) => (
                      <TableRow key={row.agent}>
                        <TableCell className="font-medium">{row.agent}</TableCell>
                        <TableCell>{row.totalErrors}</TableCell>
                        {getAllErrorTypes().map(errorType => (
                          <TableCell key={`${row.agent}-${errorType}`}>
                            {row[errorType] > 0 ? (
                              <Badge variant="outline">{row[errorType]}</Badge>
                            ) : (
                              '-'
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Error Patterns Tab */}
        <TabsContent value="patterns" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Error Patterns Treemap</CardTitle>
              <CardDescription>Visual representation of error patterns by agent</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <Treemap
                    data={formatErrorTreemapData()}
                    dataKey="value"
                    aspectRatio={4/3}
                    stroke="#fff"
                    fill="#FF7F7F"
                    nameKey="name"
                  >
                    <Tooltip 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-white p-3 border rounded shadow-sm">
                              <p className="font-medium">{data.name}</p>
                              <p className="text-sm">Agent: {data.agent || data.name}</p>
                              {data.value && <p className="text-sm">Count: {data.value}</p>}
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                  </Treemap>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {errorAnalysis.error_by_agent.slice(0, 4).map((agent: any) => (
              <Card key={agent.agent_name}>
                <CardHeader>
                  <CardTitle>{agent.agent_name}</CardTitle>
                  <CardDescription>{agent.error_count} errors</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-60">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={agent.common_errors.slice(0, 5)}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          paddingAngle={2}
                          dataKey="count"
                          nameKey="error_type"
                          label={({ error_type, percent }) => `${error_type}: ${(percent * 100).toFixed(1)}%`}
                        >
                          {agent.common_errors.slice(0, 5).map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => [`${value} occurrences`, '']} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
        
        {/* Failed Executions Tab */}
        <TabsContent value="failed" className="space-y-4">
          <div className="flex items-end gap-4 mb-6">
            <div className="grid w-full max-w-sm items-center gap-1.5">
              <Label htmlFor="errorSearch">Search Errors</Label>
              <Input
                id="errorSearch"
                placeholder="Search by error message, agent, user..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <Button variant="outline" onClick={() => setSearchTerm('')}>
              Clear
            </Button>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Failed Code Executions</CardTitle>
              <CardDescription>
                {filteredExecutions.length} {filteredExecutions.length === 1 ? 'result' : 'results'}
                {searchTerm ? ` for "${searchTerm}"` : ''}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-auto max-h-[600px]">
                <Table>
                  <TableHeader className="sticky top-0 bg-white">
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Model</TableHead>
                      <TableHead>Failed Agents</TableHead>
                      <TableHead>Error Preview</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredExecutions.map((execution) => (
                      <TableRow key={execution.execution_id}>
                        <TableCell className="font-medium whitespace-nowrap">
                          {new Date(execution.created_at).toLocaleString()}
                        </TableCell>
                        <TableCell>{execution.user_id || 'Anonymous'}</TableCell>
                        <TableCell>{execution.model_info.name || 'Unknown'}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {execution.failed_agents && execution.failed_agents.length > 0 
                              ? execution.failed_agents.map((agent: string) => (
                                <Badge key={agent} variant="outline">{agent}</Badge>
                              ))
                              : 'Unknown'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-[300px] max-h-[100px] overflow-auto text-xs font-mono bg-gray-50 p-2 rounded">
                            {execution.error_messages && Object.entries(execution.error_messages).map(
                              ([agent, message]: [string, any]) => (
                                <div key={`${execution.execution_id}-${agent}`} className="mb-2">
                                  <span className="font-semibold">{agent}:</span> {String(message).substring(0, 100)}
                                  {String(message).length > 100 ? '...' : ''}
                                </div>
                              )
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Helper function to get error type descriptions
function getErrorTypeDescription(errorType: string): string {
  const descriptions: Record<string, string> = {
    'NameError': 'Variable or function name not defined or out of scope',
    'SyntaxError': 'Invalid Python syntax',
    'TypeError': 'Operation applied to inappropriate type',
    'AttributeError': 'Object has no attribute or method being accessed',
    'IndexError/KeyError': 'Invalid index or key for sequence/mapping',
    'ImportError': 'Module or package could not be imported',
    'ValueError': 'Function received argument with correct type but inappropriate value',
    'OperationError': 'Unsupported operation between types',
    'IndentationError': 'Incorrect indentation in code',
    'PermissionError': 'No permission to access resource',
    'FileNotFoundError': 'File or directory does not exist',
    'MemoryError': 'Not enough memory to complete operation',
    'TimeoutError': 'Operation timed out before completion',
    'OtherError': 'Miscellaneous error type'
  }
  
  return descriptions[errorType] || 'No description available'
} 