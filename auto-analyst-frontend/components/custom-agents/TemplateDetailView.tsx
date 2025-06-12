"use client"

import React from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Bot, TrendingUp, Code, FileText } from 'lucide-react'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Label } from '../ui/label'
import { TemplateAgent } from './types'

interface TemplateDetailViewProps {
  template: TemplateAgent | null
  onBack: () => void
}

export default function TemplateDetailView({
  template,
  onBack
}: TemplateDetailViewProps) {
  if (!template) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center text-gray-500">
            <Bot className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-sm">Select a template to view details</p>
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
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="p-1 h-auto hover:bg-gray-200"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <Bot className="w-4 h-4 text-[#FF7F7F]" />
          <span className="font-medium text-sm">Template Details</span>
          <Badge variant="outline" className="text-xs text-[#FF7F7F] border-[#FF7F7F]">
            Template
          </Badge>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* Template Info */}
        <div className="space-y-3">
          <div>
            <h3 className="font-semibold text-base text-gray-900">{template.display_name}</h3>
            <p className="text-sm text-gray-600 mt-1">{template.description}</p>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <Badge variant="secondary" className="text-xs">{template.template_category}</Badge>
              {template.is_premium_only && (
                <Badge variant="outline" className="text-xs text-amber-600 border-amber-600">
                  Premium
                </Badge>
              )}
              <span className="text-xs text-gray-500">@{template.agent_name}</span>
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <TrendingUp className="w-3 h-3" />
                <span>{template.usage_count} uses</span>
              </div>
            </div>
          </div>

          {/* Template Prompt */}
          <div className="border rounded-lg overflow-hidden">
            <div className="bg-gray-50 px-3 py-2 border-b flex items-center gap-2">
              <Code className="w-4 h-4 text-gray-600" />
              <Label className="text-sm font-medium text-gray-700">Agent Prompt Template</Label>
            </div>
            <div className="p-3 bg-white">
              <div className="text-sm text-gray-900 whitespace-pre-wrap font-mono text-xs leading-relaxed max-h-96 overflow-y-auto bg-gray-50 p-3 rounded border">
                {template.prompt_template}
              </div>
            </div>
          </div>

          {/* Usage Information */}
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <div className="flex items-start gap-3">
              <FileText className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-blue-900 text-sm mb-1">How to Use This Template</h4>
                <div className="text-sm text-blue-800 space-y-2">
                  <p>
                    To use this agent template in your conversations, simply mention it with the @ symbol:
                  </p>
                  <div className="bg-white p-2 rounded border border-blue-300 font-mono text-xs">
                    @{template.agent_name} [your request here]
                  </div>
                  <p className="text-xs text-blue-700">
                    This template agent will handle your request according to its specialized prompt and capabilities.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Template Metadata */}
          <div className="bg-gray-50 p-3 rounded-lg border">
            <h4 className="font-medium text-gray-900 text-sm mb-2">Template Information</h4>
            <div className="space-y-1 text-xs text-gray-600">
              <div className="flex justify-between">
                <span>Agent Name:</span>
                <span className="font-mono">{template.agent_name}</span>
              </div>
              <div className="flex justify-between">
                <span>Category:</span>
                <span>{template.template_category}</span>
              </div>
              <div className="flex justify-between">
                <span>Access Level:</span>
                <span>{template.is_premium_only ? 'Premium Only' : 'All Users'}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Usage:</span>
                <span>{template.usage_count} times</span>
              </div>
              <div className="flex justify-between">
                <span>Created:</span>
                <span>{new Date(template.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 