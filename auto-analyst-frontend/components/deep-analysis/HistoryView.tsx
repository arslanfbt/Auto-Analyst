import React, { useEffect, useState } from 'react'
import { ChevronLeft, CheckCircle2, AlertCircle, Download, Trash2, Archive, Loader2, FileText } from 'lucide-react'
import { Button } from '../ui/button'
import { ScrollArea } from '../ui/scroll-area'
import { StoredReport } from './types'
import API_URL from '@/config/api'
import { useSession } from 'next-auth/react'
import { backendReportToStoredReport, getUserIdFromSession } from '@/lib/utils/report-converters'

interface HistoryViewProps {
  storedReports: StoredReport[]
  selectedHistoryReport: StoredReport | null
  onSelectReport: (report: StoredReport | null) => void
  onDownloadReport: (reportData?: any) => void
  onDeleteReport: (reportId: string) => void
  downloadingFormat?: 'html' | null
}

export default function HistoryView({
  storedReports,
  selectedHistoryReport,
  onSelectReport,
  onDownloadReport,
  onDeleteReport,
  downloadingFormat = null
}: HistoryViewProps) {
  const [fullReportData, setFullReportData] = useState<any>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const { data: session } = useSession();

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString()
  }

  const formatDuration = (start: string, end: string) => {
    const duration = new Date(end).getTime() - new Date(start).getTime()
    const minutes = Math.floor(duration / 60000)
    const seconds = Math.floor((duration % 60000) / 1000)
    return `${minutes}m ${seconds}s`
  }

  // Fetch detailed report data when a report is selected
  useEffect(() => {
    if (selectedHistoryReport && session?.user) {
      // Only fetch details if we don't already have all the data
      if (!selectedHistoryReport.deep_questions || !selectedHistoryReport.deep_plan) {
        const fetchReportDetails = async () => {
          setIsLoadingDetails(true);
          
          try {
            // Extract user ID from session using the utility function
            const userId = getUserIdFromSession(session);
            
            if (!userId) {
              console.warn('User ID not found in session');
              return;
            }
            
            const response = await fetch(
              `${API_URL}/deep_analysis/reports/uuid/${selectedHistoryReport.id}?user_id=${userId}`
            );
            
            if (!response.ok) {
              throw new Error(`Failed to fetch report details: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            // Convert backend format to frontend StoredReport format
            const fullReport = backendReportToStoredReport(data);
            
            setFullReportData(fullReport);
            onSelectReport(fullReport); // Update the selected report with full data
          } catch (error) {
            console.error('Error fetching report details:', error);
          } finally {
            setIsLoadingDetails(false);
          }
        };
        
        fetchReportDetails();
      } else {
        // We already have all the data
        setFullReportData(selectedHistoryReport);
      }
    } else {
      setFullReportData(null);
    }
  }, [selectedHistoryReport, session]);

  if (selectedHistoryReport) {
    return (
      <ScrollArea className="h-full">
        <div className="p-3">
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-3">
              <button
                onClick={() => onSelectReport(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <h3 className="text-xs font-medium text-gray-800">Report Details</h3>
              {isLoadingDetails && <Loader2 className="w-3 h-3 animate-spin ml-2" />}
            </div>

            <div className="bg-gray-50 rounded-lg p-3">
              <h4 className="font-medium text-xs text-gray-800 mb-2 break-words leading-relaxed">{selectedHistoryReport.goal}</h4>
              <div className="space-y-1 text-xs text-gray-500">
                <div>Started: {formatTime(selectedHistoryReport.startTime)}</div>
                <div>Completed: {formatTime(selectedHistoryReport.endTime)}</div>
                <div>Duration: {formatDuration(selectedHistoryReport.startTime, selectedHistoryReport.endTime)}</div>
              </div>
            </div>

            <div className="bg-white rounded-lg border p-3">
                <h5 className="text-xs font-medium text-gray-700 mb-2">Summary</h5>
                <p className="text-xs text-gray-600 break-words leading-relaxed">{selectedHistoryReport.summary}</p>
              </div>

            <div className="space-y-2">
              <div className="flex gap-2">
                <Button 
                  onClick={() => onDownloadReport(fullReportData || selectedHistoryReport)}
                  variant="outline" 
                  className="flex-1 text-xs"
                  size="sm"
                  disabled={downloadingFormat === 'html'}
                >
                  {downloadingFormat === 'html' ? (
                    <>
                      <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                      Preparing...
                    </>
                  ) : (
                    <>
                      <Download className="w-3 h-3 mr-2" />
                      Download Report
                    </>
                  )}
                </Button>
                <Button 
                  onClick={() => onDeleteReport(selectedHistoryReport.id)}
                  variant="outline"
                  className="px-3 text-xs"
                  size="sm"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
              <div className="text-xs text-gray-500 text-center">
                Downloads as HTML - you can print as PDF using your browser
              </div>
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
          <h3 className="text-xs font-medium text-gray-700">Report History</h3>
          
          {storedReports.length > 0 ? (
            <div className="space-y-2">
              {storedReports.map((report) => (
                <div
                  key={report.id}
                  className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer"
                  onClick={() => onSelectReport(report)}
                >
                  <div className="flex items-start justify-between mb-1 gap-2">
                    <h4 className="text-xs font-medium text-gray-800 flex-1 min-w-0 break-words line-clamp-2 leading-relaxed">{report.goal}</h4>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {report.status === 'completed' ? (
                        <CheckCircle2 className="w-3 h-3 text-green-500" />
                      ) : (
                        <AlertCircle className="w-3 h-3 text-red-500" />
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onDeleteReport(report.id)
                        }}
                        className="text-gray-400 hover:text-red-500 p-0.5"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{formatTime(report.endTime)}</span>
                    <span>{formatDuration(report.startTime, report.endTime)}</span>
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