import React from 'react'
import { Target, CheckCircle2, AlertCircle } from 'lucide-react'
import { Button } from '../ui/button'
import { Textarea } from '../ui/textarea'
import { ScrollArea } from '../ui/scroll-area'
import { StoredReport } from './types'

interface NewAnalysisFormProps {
  goal: string
  setGoal: (goal: string) => void
  onStartAnalysis: () => void
  isAnalysisRunning: boolean
  storedReports: StoredReport[]
  onSelectReport: (report: StoredReport) => void
}

export default function NewAnalysisForm({
  goal,
  setGoal,
  onStartAnalysis,
  isAnalysisRunning,
  storedReports,
  onSelectReport
}: NewAnalysisFormProps) {
  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString()
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-3 space-y-3">
        <div className="space-y-2">
          <label className="text-xs font-medium text-gray-700">Analysis Goal</label>
          <Textarea
            placeholder="What would you like to analyze? Be specific about your goals..."
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            disabled={isAnalysisRunning}
            rows={3}
            className="resize-none text-xs overflow-y-auto"
          />
        </div>
        
        <Button 
          onClick={onStartAnalysis}
          disabled={!goal.trim() || isAnalysisRunning}
          className="w-full text-xs bg-[#FF7F7F] hover:bg-[#FF6666] text-white"
          size="sm"
        >
          <Target className="w-3 h-3 mr-2" />
          Start Deep Analysis
        </Button>

        {storedReports.length > 0 && (
          <div className="pt-3 border-t">
            <h3 className="text-xs font-medium text-gray-700 mb-2">Recent Reports</h3>
            <div className="space-y-2">
              {storedReports.slice(0, 3).map((report) => (
                <div
                  key={report.id}
                  className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer"
                  onClick={() => onSelectReport(report)}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-800 break-words line-clamp-2 leading-relaxed">{report.goal}</p>
                      <p className="text-xs text-gray-500">{formatTime(report.endTime)}</p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {report.status === 'completed' ? (
                        <CheckCircle2 className="w-3 h-3 text-green-500" />
                      ) : (
                        <AlertCircle className="w-3 h-3 text-red-500" />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </ScrollArea>
  )
} 