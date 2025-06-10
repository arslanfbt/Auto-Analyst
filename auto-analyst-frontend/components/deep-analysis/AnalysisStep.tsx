import React from 'react'
import { Loader2, CheckCircle2, X } from 'lucide-react'
import { AnalysisStep as AnalysisStepType } from './types'

interface AnalysisStepProps {
  step: AnalysisStepType
  refreshTrigger: number
}

export default function AnalysisStep({ step, refreshTrigger }: AnalysisStepProps) {
  const getStepIcon = (status: AnalysisStepType['status']) => {
    switch (status) {
      case 'processing':
      case 'starting':
        return <Loader2 className="w-4 h-4 animate-spin text-[#FF7F7F]" />
      case 'completed':
      case 'success':
        return <CheckCircle2 className="w-4 h-4 text-green-500" />
      case 'failed':
        return <X className="w-4 h-4 text-red-500" />
      default:
        return <div className="w-4 h-4 rounded-full border-2 border-gray-300" />
    }
  }

  const getStepClassName = (status: AnalysisStepType['status']) => {
    switch (status) {
      case 'processing':
      case 'starting':
        return 'bg-red-50 border-red-200 shadow-md'
      case 'completed':
      case 'success':
        return 'bg-green-50 border-green-200'
      case 'failed':
        return 'bg-red-50 border-red-200'
      default:
        return 'bg-gray-50 border-gray-200'
    }
  }

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString()
  }

  const getStepDisplayName = (stepName: string) => {
    const stepNames: Record<string, string> = {
      'initialization': 'Initialization',
      'questions': 'Questions',
      'planning': 'Planning',
      'analysis': 'Analysis',
      'synthesis': 'Synthesis',
      'report': 'Report',
      'completed': 'Completed'
    }
    return stepNames[stepName] || stepName.replace('_', ' ')
  }

  return (
    <div
      key={`${step.step}-${refreshTrigger}-${step.status}`}
      className={`flex items-center gap-2 p-2 rounded-lg border transition-all duration-300 ${getStepClassName(step.status)}`}
    >
      {getStepIcon(step.status)}
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium capitalize">
          {getStepDisplayName(step.step)}
        </div>
        {step.message && (
          <div className="text-xs text-gray-600 truncate">
            {step.message}
          </div>
        )}
        {step.progress !== undefined && step.status === 'processing' && (
          <div className="mt-1">
            <div className="w-full bg-gray-200 rounded-full h-1">
              <div 
                className="bg-[#FF7F7F] h-1 rounded-full transition-all duration-300" 
                style={{ width: `${step.progress}%` }}
              ></div>
            </div>
          </div>
        )}
        {step.timestamp && step.status !== 'pending' && (
          <div className="text-xs text-gray-400 mt-1">
            {formatTime(step.timestamp)}
          </div>
        )}
      </div>
    </div>
  )
} 