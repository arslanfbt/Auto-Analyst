import React from 'react'
import { Brain, Loader2, CheckCircle2, AlertCircle, Download } from 'lucide-react'
import { Button } from '../ui/button'
import { Progress } from '../ui/progress'
import { Badge } from '../ui/badge'
import { ScrollArea } from '../ui/scroll-area'
import ReactMarkdown from 'react-markdown'
import AnalysisStep from './AnalysisStep'
import { DeepAnalysisReport } from './types'

interface CurrentAnalysisViewProps {
  currentReport: DeepAnalysisReport | null
  refreshTrigger: number
  onDownloadReport: (reportData?: any) => void
  isDownloadingReport?: boolean
}

export default function CurrentAnalysisView({
  currentReport,
  refreshTrigger,
  onDownloadReport,
  isDownloadingReport = false
}: CurrentAnalysisViewProps) {
  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString()
  }

  const formatDuration = (start: string, end?: string) => {
    if (!end) return 'Running...'
    const duration = new Date(end).getTime() - new Date(start).getTime()
    const minutes = Math.floor(duration / 60000)
    const seconds = Math.floor((duration % 60000) / 1000)
    return `${minutes}m ${seconds}s`
  }

  if (!currentReport) {
    return (
      <ScrollArea className="h-full">
        <div className="p-3">
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <Brain className="w-10 h-10 text-gray-300 mb-3" />
            <p className="text-xs text-gray-500 mb-2">No active analysis</p>
            <p className="text-xs text-gray-400">Start a new analysis to see progress here</p>
          </div>
        </div>
      </ScrollArea>
    )
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-3 space-y-3">
        {/* Analysis Info */}
        <div className="bg-gray-50 rounded-lg p-3">
          <h3 className="font-medium text-xs text-gray-800 mb-1">{currentReport.goal}</h3>
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Started: {formatTime(currentReport.startTime)}</span>
            <span>{formatDuration(currentReport.startTime, currentReport.endTime)}</span>
          </div>
        </div>

        {/* Progress */}
        {currentReport.status === 'running' && (
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span>Progress</span>
              <span className="font-medium">{Math.round(currentReport.progress)}%</span>
            </div>
            <Progress value={currentReport.progress} className="w-full transition-all duration-500" />
            <div className="text-xs text-gray-500 text-center">
              {currentReport.steps.find(s => s.status === 'processing' || s.status === 'starting')?.message || 'Processing...'}
            </div>
          </div>
        )}

        {/* Status Badge */}
        <div className="flex justify-center">
          <Badge 
            variant={
              currentReport.status === 'completed' ? 'default' :
              currentReport.status === 'running' ? 'secondary' : 'destructive'
            }
            className="text-xs"
          >
            {currentReport.status === 'running' && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
            {currentReport.status === 'completed' && <CheckCircle2 className="w-3 h-3 mr-1" />}
            {currentReport.status === 'failed' && <AlertCircle className="w-3 h-3 mr-1" />}
            {currentReport.status.charAt(0).toUpperCase() + currentReport.status.slice(1)}
          </Badge>
        </div>

        {/* Steps */}
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-gray-700">Analysis Steps</h4>
          <div className="space-y-1">
            {currentReport.steps.map((step, index) => (
              <AnalysisStep
                key={`${step.step}-${index}`}
                step={step}
                refreshTrigger={refreshTrigger}
              />
            ))}
          </div>
        </div>

        {/* Download Button */}
        {currentReport.status === 'completed' && (
          <Button 
            onClick={() => onDownloadReport(currentReport)}
            variant="outline" 
            className="w-full text-xs"
            size="sm"
            disabled={isDownloadingReport}
          >
            {isDownloadingReport ? (
              <>
                <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                Preparing Report...
              </>
            ) : (
              <>
                <Download className="w-3 h-3 mr-2" />
                Download Report
              </>
            )}
          </Button>
        )}

        {/* Results Preview */}
        {currentReport.status === 'completed' && (
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-gray-700">Quick Preview</h4>
            
            {currentReport.final_conclusion && (
              <div className="bg-green-50 rounded-lg p-2">
                <h5 className="text-xs font-medium text-green-800 mb-1">Conclusion</h5>
                <div className="text-xs text-green-700">
                  <ReactMarkdown className="prose prose-xs max-w-none">
                    {currentReport.final_conclusion.substring(0, 200) + '...'}
                  </ReactMarkdown>
                </div>
              </div>
            )}

            {currentReport.plotly_figs && currentReport.plotly_figs.length > 0 && (
              <div className="bg-red-50 rounded-lg p-2">
                <h5 className="text-xs font-medium text-red-800 mb-1">
                  {currentReport.plotly_figs.flat().length} Visualization(s) Generated
                </h5>
                <p className="text-xs text-red-700">View full report for interactive charts</p>
              </div>
            )}
          </div>
        )}
      </div>
    </ScrollArea>
  )
} 