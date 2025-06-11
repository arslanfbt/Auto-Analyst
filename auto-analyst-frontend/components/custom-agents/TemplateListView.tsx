"use client"

import React from 'react'
import { motion } from 'framer-motion'
import { Bot, Lock, Copy, TrendingUp } from 'lucide-react'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { TemplateAgent, TemplatesByCategory } from './types'

interface TemplateListViewProps {
  templateCategories: TemplatesByCategory[]
  onSelectTemplate: (template: TemplateAgent) => void
  onCloneTemplate: (template: TemplateAgent) => void
  hasAccess: boolean
  onUpgradePrompt: () => void
}

export default function TemplateListView({
  templateCategories,
  onSelectTemplate,
  onCloneTemplate,
  hasAccess,
  onUpgradePrompt
}: TemplateListViewProps) {
  if (templateCategories.length === 0) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex-1 overflow-y-auto p-3">
          <div className="text-center py-8 text-gray-500">
            <Bot className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-sm">Loading templates...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-3 border-b border-gray-200 bg-gray-50 flex-shrink-0">
        <div className="flex items-center gap-2 mb-2">
          <Bot className="w-4 h-4 text-[#FF7F7F]" />
          <span className="font-medium text-sm">Agent Templates</span>
        </div>
        <p className="text-xs text-gray-600">
          Professional templates you can use immediately. {!hasAccess && 'Upgrade to Premium to use these agents.'}
        </p>
      </div>

      {/* Templates List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {templateCategories.map((category) => (
          <div key={category.category} className="space-y-3">
            <h3 className="font-semibold text-sm text-gray-800 border-b border-gray-200 pb-1">
              {category.category}
            </h3>
            <div className="space-y-2">
              {category.templates.map((template) => (
                <motion.div
                  key={template.agent_name}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 border border-gray-200 rounded-lg hover:border-[#FF7F7F] hover:bg-red-50/30 transition-colors cursor-pointer group"
                  onClick={() => onSelectTemplate(template)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-sm text-gray-900">
                          {template.display_name}
                        </h4>
                        <Badge variant="outline" className="text-xs text-[#FF7F7F] border-[#FF7F7F]">
                          Template
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                        {template.description}
                      </p>
                      <div className="flex items-center justify-between mt-2">
                        <div className="text-xs text-gray-500">
                          @{template.agent_name}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <TrendingUp className="w-3 h-3" />
                          <span>{template.usage_count} uses</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {hasAccess ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs h-7 px-2"
                          onClick={(e) => {
                            e.stopPropagation()
                            onCloneTemplate(template)
                          }}
                        >
                          <Copy className="w-3 h-3 mr-1" />
                          Clone
                        </Button>
                      ) : (
                        <Lock className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
} 