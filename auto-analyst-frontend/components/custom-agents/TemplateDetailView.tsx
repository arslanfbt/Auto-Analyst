"use client"

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Copy, Bot, Lock, Crown, TrendingUp } from 'lucide-react'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Textarea } from '../ui/textarea'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import { useToast } from '../ui/use-toast'
import { TemplateAgent } from './types'

interface TemplateDetailViewProps {
  template: TemplateAgent | null
  onBack: () => void
  onCloneTemplate: (templateData: {
    agent_name: string
    display_name: string
    description: string
    prompt_template: string
  }) => Promise<boolean>
  hasAccess: boolean
  onUpgradePrompt: () => void
}

export default function TemplateDetailView({
  template,
  onBack,
  onCloneTemplate,
  hasAccess,
  onUpgradePrompt
}: TemplateDetailViewProps) {
  const [isCloning, setIsCloning] = useState(false)
  const [cloneData, setCloneData] = useState({
    agent_name: '',
    display_name: '',
    description: '',
    prompt_template: ''
  })
  const { toast } = useToast()

  // Initialize clone data when template changes
  React.useEffect(() => {
    if (template) {
      setCloneData({
        agent_name: `${template.agent_name}_copy`,
        display_name: `${template.display_name} (Copy)`,
        description: template.description,
        prompt_template: template.prompt_template
      })
    }
  }, [template])

  const handleClone = async () => {
    if (!hasAccess) {
      onUpgradePrompt()
      return
    }

    if (!cloneData.agent_name.trim() || !cloneData.display_name.trim() || !cloneData.description.trim() || !cloneData.prompt_template.trim()) {
      toast({
        title: "Validation Error",
        description: "All fields are required",
        variant: "destructive",
      })
      return
    }

    setIsCloning(true)
    try {
      const success = await onCloneTemplate(cloneData)
      if (success) {
        toast({
          title: "Template Cloned! 🎉",
          description: "Template has been cloned to your custom agents",
          duration: 3000,
        })
        onBack()
      }
    } catch (error) {
      console.error('Error cloning template:', error)
    } finally {
      setIsCloning(false)
    }
  }

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
              <span className="text-xs text-gray-500">@{template.agent_name}</span>
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <TrendingUp className="w-3 h-3" />
                <span>{template.usage_count} uses</span>
              </div>
            </div>
          </div>

          <div className="p-3 bg-gray-50 rounded-lg border">
            <Label className="text-xs font-medium text-gray-700 mb-2 block">Template Prompt</Label>
            <div className="text-sm text-gray-900 whitespace-pre-wrap bg-white p-3 rounded border max-h-40 overflow-y-auto">
              {template.prompt_template}
            </div>
          </div>
        </div>

        {/* Clone Section */}
        <div className="border-t border-gray-200 pt-4">
          <div className="flex items-center gap-2 mb-3">
            <Copy className="w-4 h-4 text-[#FF7F7F]" />
            <h4 className="font-medium text-sm">Clone Template</h4>
            {!hasAccess && <Lock className="w-4 h-4 text-gray-400" />}
          </div>

          {!hasAccess ? (
            <div className="p-4 bg-gradient-to-r from-red-50 to-orange-50 rounded-lg border border-[#FF7F7F]/20">
              <div className="flex items-center gap-3">
                <Crown className="w-5 h-5 text-[#FF7F7F]" />
                <div>
                  <h5 className="font-medium text-gray-900 text-sm">Premium Required</h5>
                  <p className="text-sm text-gray-700 mt-1">
                    Upgrade to clone and customize this template.
                  </p>
                </div>
              </div>
              <Button
                onClick={onUpgradePrompt}
                className="w-full mt-3 bg-gradient-to-r from-[#FF7F7F] to-[#FF6666] hover:from-[#FF6666] hover:to-[#E55555] text-white"
              >
                <Crown className="w-4 h-4 mr-2" />
                Upgrade Now
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <Label htmlFor="clone-name" className="text-xs font-medium text-gray-700">
                  Agent Name *
                </Label>
                <Input
                  id="clone-name"
                  value={cloneData.agent_name}
                  onChange={(e) => setCloneData(prev => ({ ...prev, agent_name: e.target.value }))}
                  placeholder="e.g., my_custom_agent"
                  className="mt-1 text-sm"
                />
              </div>

              <div>
                <Label htmlFor="clone-display-name" className="text-xs font-medium text-gray-700">
                  Display Name *
                </Label>
                <Input
                  id="clone-display-name"
                  value={cloneData.display_name}
                  onChange={(e) => setCloneData(prev => ({ ...prev, display_name: e.target.value }))}
                  placeholder="My Custom Agent"
                  className="mt-1 text-sm"
                />
              </div>

              <div>
                <Label htmlFor="clone-description" className="text-xs font-medium text-gray-700">
                  Description *
                </Label>
                <Textarea
                  id="clone-description"
                  value={cloneData.description}
                  onChange={(e) => setCloneData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe what this agent does..."
                  className="mt-1 text-sm"
                  rows={2}
                />
              </div>

              <div>
                <Label htmlFor="clone-prompt" className="text-xs font-medium text-gray-700">
                  Prompt Template *
                </Label>
                <Textarea
                  id="clone-prompt"
                  value={cloneData.prompt_template}
                  onChange={(e) => setCloneData(prev => ({ ...prev, prompt_template: e.target.value }))}
                  placeholder="Define the agent's behavior and instructions..."
                  className="mt-1 text-sm"
                  rows={6}
                />
              </div>

              <Button
                onClick={handleClone}
                disabled={isCloning}
                className="w-full bg-[#FF7F7F] hover:bg-[#FF6666] text-white"
              >
                {isCloning ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"
                    />
                    Cloning...
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-2" />
                    Clone Template
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 