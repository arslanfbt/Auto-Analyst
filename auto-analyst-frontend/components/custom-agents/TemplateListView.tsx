"use client"

import React, { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Bot, TrendingUp, Search, X, Eye } from 'lucide-react'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { TemplateAgent, TemplatesByCategory } from './types'
import FeedbackPopup from '../chat/FeedbackPopup'

interface TemplateListViewProps {
  templateCategories: TemplatesByCategory[]
  onSelectTemplate: (template: TemplateAgent) => void
}

export default function TemplateListView({
  templateCategories,
  onSelectTemplate
}: TemplateListViewProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [showFeedbackPopup, setShowFeedbackPopup] = useState(false)

  // Filter templates based on search query
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) {
      return templateCategories
    }

    const query = searchQuery.toLowerCase().trim()
    
    return templateCategories.map(category => ({
      ...category,
      templates: category.templates.filter(template => 
        template.display_name.toLowerCase().includes(query) ||
        template.agent_name.toLowerCase().includes(query) ||
        template.description.toLowerCase().includes(query) ||
        category.category.toLowerCase().includes(query)
      )
    })).filter(category => category.templates.length > 0)
  }, [templateCategories, searchQuery])

  // Check if we have any results
  const hasResults = filteredCategories.length > 0
  const totalFilteredTemplates = filteredCategories.reduce((sum, category) => sum + category.templates.length, 0)

  const clearSearch = () => {
    setSearchQuery('')
  }

  const handleRequestTemplate = () => {
    setShowFeedbackPopup(true)
  }

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
        <p className="text-xs text-gray-600 mb-3">
          Browse professional AI agent templates to see what's possible with specialized agents.
        </p>
        
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search templates by name, category, or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-10 text-sm h-9"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearSearch}
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7 p-0 hover:bg-gray-200"
            >
              <X className="w-3 h-3" />
            </Button>
          )}
        </div>
        
        {/* Search Results Info */}
        {searchQuery && (
          <div className="mt-2 text-xs text-gray-600">
            {hasResults ? (
              `Found ${totalFilteredTemplates} template${totalFilteredTemplates !== 1 ? 's' : ''} matching "${searchQuery}"`
            ) : (
              `No templates found for "${searchQuery}"`
            )}
          </div>
        )}
      </div>

      {/* Templates List or No Results */}
      <div className="flex-1 overflow-y-auto">
        {hasResults ? (
          <div className="p-3 space-y-4">
            {filteredCategories.map((category) => (
              <div key={category.category} className="space-y-3">
                <h3 className="font-semibold text-sm text-gray-800 border-b border-gray-200 pb-1">
                  {category.category}
                  <span className="ml-2 text-xs font-normal text-gray-500">
                    ({category.templates.length})
                  </span>
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
                            {template.is_premium_only && (
                              <Badge variant="outline" className="text-xs text-amber-600 border-amber-600">
                                Premium
                              </Badge>
                            )}
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
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs h-7 px-2"
                            onClick={(e) => {
                              e.stopPropagation()
                              onSelectTemplate(template)
                            }}
                          >
                            <Eye className="w-3 h-3 mr-1" />
                            View
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="text-center text-gray-500">
              <Search className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <h3 className="font-medium text-gray-900 mb-2">No templates found</h3>
              <p className="text-sm mb-4">
                We couldn't find any templates matching "{searchQuery}".
              </p>
              <div className="space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearSearch}
                  className="mr-2"
                >
                  Clear search
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRequestTemplate}
                >
                  Request a template
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Feedback Popup */}
      {showFeedbackPopup && (
        <FeedbackPopup
          isOpen={showFeedbackPopup}
          onClose={() => setShowFeedbackPopup(false)}
        />
      )}
    </div>
  )
} 