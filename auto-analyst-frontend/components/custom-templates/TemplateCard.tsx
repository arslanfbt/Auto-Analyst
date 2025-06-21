import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Sparkles, Lock, TrendingUp, Check } from 'lucide-react'
import { Badge } from '../ui/badge'
import { TemplateAgent, TemplatePreference } from './types'

interface TemplateCardProps {
  template: TemplateAgent
  preference?: TemplatePreference
  isEnabled: boolean
  hasAccess: boolean
  isLastTemplate?: boolean
  wouldExceedMax?: boolean
  onToggleChange: (templateId: number, enabled: boolean) => void
}

export default function TemplateCard({
  template,
  preference,
  isEnabled,
  hasAccess,
  isLastTemplate = false,
  wouldExceedMax = false,
  onToggleChange
}: TemplateCardProps) {
  const [imageError, setImageError] = useState(false)
  
  // User can only toggle if they have access (covers both free and premium users)
  // Premium-only templates are only toggleable by premium users (hasAccess = true for premium)
  // Also cannot disable if this is the last template
  // Also cannot enable if it would exceed the maximum limit
  const canToggle = hasAccess && !(isEnabled && isLastTemplate) && !(!isEnabled && wouldExceedMax)

  const handleClick = () => {
    if (canToggle) {
      onToggleChange(template.template_id, !isEnabled)
    }
  }

  // Determine the status text and color
  const getStatusInfo = () => {
    if (!hasAccess) {
      return { text: 'Premium', color: 'text-gray-400' }
    }
    if (isEnabled && isLastTemplate) {
      return { text: 'Required', color: 'text-orange-600' }
    }
    if (!isEnabled && wouldExceedMax) {
      return { text: 'Limit reached', color: 'text-gray-400' }
    }
    if (isEnabled) {
      return { text: 'Active', color: 'text-green-600' }
    }
    return { text: 'Inactive', color: 'text-gray-400' }
  }

  const statusInfo = getStatusInfo()

  // Remove "(Planner)" suffix from display name since we're in a planner context
  const cleanDisplayName = template.display_name?.replace(/\s*\(Planner\)\s*$/i, '') || template.template_name

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative p-4 border rounded-lg transition-all duration-200 ${
        isEnabled 
          ? 'bg-gradient-to-br from-[#FF7F7F]/5 to-[#FF7F7F]/10 border-[#FF7F7F]/30 shadow-sm' 
          : !canToggle
            ? 'bg-gradient-to-br from-[#FF7F7F]/5 to-[#FF7F7F]/10 border-[#FF7F7F]/20 shadow-sm'
            : 'bg-white hover:bg-gray-50 border-gray-200'
      } ${!canToggle ? 'opacity-90' : ''}`}
      title={
        isEnabled && isLastTemplate 
          ? 'At least one agent must remain active' 
          : !isEnabled && wouldExceedMax 
            ? 'Maximum of 10 agents reached. Disable another agent first.'
            : undefined
      }
    >
      {/* Lock overlay for free users */}
      {!canToggle && (
        <div className="absolute inset-0 bg-gradient-to-br from-[#FF7F7F]/5 to-[#FF7F7F]/10 rounded-lg pointer-events-none" />
      )}
      <div className="flex items-start justify-between">
        <div className="flex-1 pr-4">
          <div className="flex items-center gap-2 mb-2">
            {/* Template Icon */}
            <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
              {template.icon_url && !imageError ? (
                  <img 
                    src={template.icon_url} 
                    alt={`${template.template_name} icon`}
                    className="w-5 h-5 object-contain"
                  onError={() => setImageError(true)}
                />
              ) : (
                // Show Sparkles icon if no icon_url or image failed to load
                <Sparkles className="w-4 h-4 text-[#FF7F7F]" />
              )}
            </div>
            
            <h3 className="font-medium text-gray-900 text-sm">{cleanDisplayName}</h3>
            <div className="flex items-center gap-1">
              {template.is_premium_only && (
                <Badge variant="outline" className="text-xs border-[#FF7F7F] text-[#FF7F7F] px-1 py-0 h-5 flex items-center">
                  <Sparkles className="w-2.5 h-2.5 mr-1" />
                </Badge>
              )}
              {!hasAccess && (
                <Badge variant="outline" className="text-xs border-[#FF7F7F]/40 text-[#FF7F7F] bg-[#FF7F7F]/10 px-1 py-0 h-5 flex items-center">
                  <Lock className="w-2.5 h-2.5 mr-1" />
                  Premium
                </Badge>
              )}
              {/* {isEnabled && isLastTemplate && (
                <Badge variant="outline" className="text-xs border-orange-400 text-orange-600 bg-orange-50 px-1 py-0 h-5 flex items-center">
                  Required
                </Badge>
              )} */}
            </div>
          </div>
          
          <Badge variant="secondary" className="text-xs mb-2 bg-gray-100">
            {template.template_category}
          </Badge>
          
          <p className="text-xs text-gray-600 mb-3 line-clamp-2">{template.description}</p>
          
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              {template.usage_count || 0} use{template.usage_count === 1 ? '' : 's'}
            </span>
          </div>
        </div>
        
        {/* Checkmark selector */}
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end gap-1">
            <button
              onClick={handleClick}
              disabled={!canToggle}
              className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all duration-200 ${
                isEnabled
                  ? isLastTemplate 
                    ? 'bg-orange-500 border-orange-500 text-white'
                    : 'bg-[#FF7F7F] border-[#FF7F7F] text-white'
                  : 'border-gray-300 hover:border-[#FF7F7F] bg-white'
              } ${!canToggle ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:scale-105'}`}
              title={
                isEnabled && isLastTemplate 
                  ? 'At least one agent must remain active' 
                  : !isEnabled && wouldExceedMax 
                    ? 'Maximum of 10 agents reached'
                    : undefined
              }
            >
              {isEnabled && <Check className="w-4 h-4" />}
            </button>
            <span className={`text-xs ${statusInfo.color}`}>
              {statusInfo.text}
            </span>
            {isEnabled && isLastTemplate && (
              <span className="text-xs text-orange-600 font-medium">
                Min required
              </span>
            )}
            {!isEnabled && wouldExceedMax && (
              <span className="text-xs text-gray-500 font-medium">
                Max reached
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
} 