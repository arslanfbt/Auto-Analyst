import React, { useState, useEffect } from 'react'
import { ChevronLeft, CheckCircle2, AlertCircle, Download, Trash2, Archive, Loader2, RefreshCw } from 'lucide-react'
import { Button } from '../ui/button'
import { ScrollArea } from '../ui/scroll-area'
import { StoredReport, DatabaseAnalysisReport } from './types'
import { useSession } from 'next-auth/react'
import { useToast } from '../ui/use-toast'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface HistoryViewProps {
  sessionId?: string
  onDownloadReport?: (chatId: number) => void
  onDeleteReport?: (chatId: number) => void
  isDownloadingReport?: boolean
}

export default function HistoryView({
  sessionId,
  onDownloadReport,
  onDeleteReport,
  isDownloadingReport = false
}: HistoryViewProps) {
  const [storedReports, setStoredReports] = useState<StoredReport[]>([])
  const [selectedHistoryReport, setSelectedHistoryReport] = useState<DatabaseAnalysisReport | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingDetails, setIsLoadingDetails] = useState(false)
  const { data: session } = useSession()
  const { toast } = useToast()

  // Get user ID from session
  const getUserId = (): number | undefined => {
    if (!session?.user) return undefined
    
    // Try different ways to extract user ID
    if ((session.user as any).sub) {
      return parseInt((session.user as any).sub) || undefined
    } else if ((session.user as any).id) {
      return parseInt((session.user as any).id) || undefined
    }
    return undefined
  }

  // Fetch analysis history from database
  const fetchAnalysisHistory = async () => {
    if (!session?.user?.email) {
      console.log('[HistoryView] No user session, clearing reports')
      setStoredReports([])
      return
    }

    console.log('[HistoryView] Fetching analysis history for user:', session.user.email)
    setIsLoading(true)
    try {
      let userId = getUserId()
      
      console.log('[HistoryView] Initial userId:', userId)
      
      // If we don't have a numeric user ID, create/get user via email
      if (!userId && session.user.email) {
        try {
          console.log('[HistoryView] Creating/getting user via email:', session.user.email)
          
          const userResponse = await fetch(`${API_URL}/chats/users`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(sessionId && { 'X-Session-ID': sessionId })
            },
            body: JSON.stringify({
              username: session.user.name || 'Anonymous User',
              email: session.user.email
            })
          })
          
          console.log('[HistoryView] User response status:', userResponse.status)
          
          if (userResponse.ok) {
            const userData = await userResponse.json()
            userId = userData.user_id
            console.log('[HistoryView] Got userId from API:', userId)
          } else {
            const errorText = await userResponse.text()
            console.error('[HistoryView] Failed to create/get user:', userResponse.status, errorText)
          }
        } catch (error) {
          console.warn('[HistoryView] Failed to get/create user:', error)
        }
      }

      // Fetch deep analysis history
      const params = new URLSearchParams()
      if (userId) params.append('user_id', userId.toString())
      params.append('limit', '20')
      params.append('offset', '0')

      console.log('[HistoryView] Fetching history with params:', params.toString())

      const response = await fetch(`${API_URL}/deep_analysis/history?${params}`, {
        headers: {
          ...(sessionId && { 'X-Session-ID': sessionId })
        }
      })

      console.log('[HistoryView] History response status:', response.status)

      if (response.ok) {
        const data = await response.json()
        console.log('[HistoryView] History data received:', data.length, 'items')
        setStoredReports(data)
      } else {
        const errorText = await response.text()
        console.error('[HistoryView] Failed to fetch analysis history:', response.status, errorText)
        toast({
          title: "Error",
          description: `Failed to load analysis history (${response.status})`,
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('[HistoryView] Error fetching analysis history:', error)
      toast({
        title: "Error", 
        description: "Network error loading analysis history",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Load history on component mount and when session changes
  useEffect(() => {
    fetchAnalysisHistory()
  }, [session?.user?.email, sessionId])

  // Fetch detailed report data
  const fetchReportDetails = async (chatId: number) => {
    const userId = getUserId()
    setIsLoadingDetails(true)
    
    try {
      const params = new URLSearchParams()
      if (userId) params.append('user_id', userId.toString())

      console.log('[HistoryView] Fetching report details for chat:', chatId, 'userId:', userId)
      
      const response = await fetch(`${API_URL}/deep_analysis/chats/${chatId}/summary?${params}`, {
        headers: {
          ...(sessionId && { 'X-Session-ID': sessionId })
        }
      })

      console.log('[HistoryView] Report details response status:', response.status)

      if (response.ok) {
        const data = await response.json()
        console.log('[HistoryView] Report details data:', data)
        
        // Validate the response structure
        if (data.analysis_summary) {
          setSelectedHistoryReport(data)
          console.log('[HistoryView] Successfully set selected report')
        } else {
          console.error('[HistoryView] Invalid response structure:', data)
          toast({
            title: "Error",
            description: "Invalid report data received",
            variant: "destructive"
          })
        }
      } else {
        const errorText = await response.text()
        console.error('[HistoryView] Failed to fetch report details:', response.status, errorText)
        toast({
          title: "Error",
          description: `Failed to load report details (${response.status})`,
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error('[HistoryView] Error fetching report details:', error)
      toast({
        title: "Error",
        description: "Network error loading report details", 
        variant: "destructive"
      })
    } finally {
      setIsLoadingDetails(false)
    }
  }

  // Handle report selection
  const handleSelectReport = async (report: StoredReport | null) => {
    if (!report) {
      setSelectedHistoryReport(null)
      return
    }
    
    await fetchReportDetails(report.chat_id)
  }

  // Handle download report
  const handleDownload = async (chatId: number) => {
    console.log('[HistoryView] handleDownload called with chatId:', chatId, 'type:', typeof chatId)
    
    if (onDownloadReport) {
      await onDownloadReport(chatId)
    }
  }

  // Handle delete report 
  const handleDelete = async (chatId: number) => {
    console.log('[HistoryView] handleDelete called with chatId:', chatId, 'type:', typeof chatId)
    
    if (onDeleteReport) {
      await onDeleteReport(chatId)
      // Refresh the list after deletion
      await fetchAnalysisHistory()
    }
  }

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString()
  }

  const formatDuration = (duration?: string) => {
    if (!duration) return 'Unknown'
    return duration
  }

  // If no user session, show message
  if (!session?.user?.email) {
    return (
      <ScrollArea className="h-full">
        <div className="p-3">
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <Archive className="w-6 h-6 text-gray-300 mb-2" />
            <p className="text-xs text-gray-500 mb-1">Sign in to view history</p>
            <p className="text-xs text-gray-400">Your analysis reports will be saved automatically</p>
          </div>
        </div>
      </ScrollArea>
    )
  }

  if (selectedHistoryReport) {
    const { analysis_summary } = selectedHistoryReport
    
    return (
      <ScrollArea className="h-full">
        <div className="p-3">
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-3">
              <button
                onClick={() => setSelectedHistoryReport(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <h3 className="text-xs font-medium text-gray-800">Report Details</h3>
            </div>

            <div className="bg-gray-50 rounded-lg p-3">
              <h4 className="font-medium text-xs text-gray-800 mb-2">{analysis_summary.goal}</h4>
              <div className="space-y-1 text-xs text-gray-500">
                <div>Created: {formatTime(selectedHistoryReport.created_at)}</div>
                <div>Completed: {formatTime(analysis_summary.timestamp)}</div>
                <div>Duration: {formatDuration(analysis_summary.duration)}</div>
                <div>Status: <span className="capitalize">{analysis_summary.status}</span></div>
              </div>
            </div>

            <div className="bg-white rounded-lg border p-3">
              <h5 className="text-xs font-medium text-gray-700 mb-2">Summary</h5>
              <p className="text-xs text-gray-600">{analysis_summary.summary}</p>
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={() => handleDownload(selectedHistoryReport.chat_id)}
                variant="outline" 
                className="flex-1 text-xs"
                size="sm"
                disabled={isDownloadingReport}
              >
                {isDownloadingReport ? (
                  <>
                    <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                    Preparing...
                  </>
                ) : (
                  <>
                    <Download className="w-3 h-3 mr-2" />
                    Download
                  </>
                )}
              </Button>
              <Button 
                onClick={() => handleDelete(selectedHistoryReport.chat_id)}
                variant="outline"
                className="px-3 text-xs"
                size="sm"
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </div>
      </ScrollArea>
    )
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-3">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-medium text-gray-700">Report History</h3>
            <Button
              onClick={fetchAnalysisHistory}
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              disabled={isLoading}
            >
              <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-6">
              <Loader2 className="w-4 h-4 animate-spin text-gray-400 mb-2" />
              <p className="text-xs text-gray-500">Loading history...</p>
            </div>
          ) : storedReports.length > 0 ? (
            <div className="space-y-2">
              {storedReports.map((report) => (
                <div
                  key={report.chat_id}
                  className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer"
                  onClick={() => handleSelectReport(report)}
                >
                  <div className="flex items-start justify-between mb-1">
                    <h4 className="text-xs font-medium text-gray-800 line-clamp-2">{report.goal}</h4>
                    <div className="flex items-center gap-1 ml-2">
                      {report.status === 'completed' ? (
                        <CheckCircle2 className="w-3 h-3 text-green-500" />
                      ) : (
                        <AlertCircle className="w-3 h-3 text-red-500" />
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDelete(report.chat_id)
                        }}
                        className="text-gray-400 hover:text-red-500 p-0.5"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{formatTime(report.updated_at)}</span>
                    <span>{formatDuration(report.duration)}</span>
                  </div>
                  <div className="mt-1">
                    <p className="text-xs text-gray-500 line-clamp-2">{report.summary}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <Archive className="w-6 h-6 text-gray-300 mb-2" />
              <p className="text-xs text-gray-500 mb-1">No reports yet</p>
              <p className="text-xs text-gray-400">Completed analyses will appear here</p>
            </div>
          )}
        </div>
      </div>
    </ScrollArea>
  )
} 