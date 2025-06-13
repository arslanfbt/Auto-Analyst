import React from 'react'
import { motion } from 'framer-motion'
import { Sparkles, Lock, TrendingUp } from 'lucide-react'
import { Switch } from '../ui/switch'
import { Badge } from '../ui/badge'
import { TemplateAgent, TemplatePreference } from './types'

interface TemplateCardProps {
  template: TemplateAgent
  preference?: TemplatePreference
  isEnabled: boolean
  hasAccess: boolean
  onToggleChange: (templateId: number, enabled: boolean) => void
}

export default function TemplateCard({
  template,
  preference,
  isEnabled,
  hasAccess,
  onToggleChange
}: TemplateCardProps) {
  // User can only toggle if they have access (covers both free and premium users)
  // Premium-only templates are only toggleable by premium users (hasAccess = true for premium)
  const canToggle = hasAccess

  const handleToggle = (checked: boolean) => {
    if (canToggle) {
      onToggleChange(template.template_id, checked)
    }
  }

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
    >
      {/* Lock overlay for free users */}
      {!canToggle && (
        <div className="absolute inset-0 bg-gradient-to-br from-[#FF7F7F]/5 to-[#FF7F7F]/10 rounded-lg pointer-events-none" />
      )}
      <div className="flex items-start justify-between">
        <div className="flex-1 pr-4">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="font-medium text-gray-900 text-sm">{template.display_name}</h3>
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
        
        {/* Toggle switch */}
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end gap-1">
            <Switch
              checked={isEnabled}
              onCheckedChange={handleToggle}
              disabled={!canToggle}
              className={`data-[state=checked]:bg-[#FF7F7F] ${!canToggle ? 'opacity-50 cursor-not-allowed' : ''}`}
            />
            <span className={`text-xs ${
              !canToggle 
                ? 'text-gray-400'
                : isEnabled 
                  ? 'text-green-600' 
                  : 'text-gray-400'
            }`}>
              {!canToggle 
                ? 'Premium'
                : isEnabled 
                  ? 'Active' 
                  : 'Inactive'
              }
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  )
} 