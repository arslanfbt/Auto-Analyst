"use client"

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Settings, Save, RefreshCw, CheckCircle, XCircle, Info, Lock } from 'lucide-react'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Switch } from '../ui/switch'
import { useToast } from '../ui/use-toast'
import { Alert, AlertDescription } from '../ui/alert'
import { useUserSubscriptionStore } from '@/lib/store/userSubscriptionStore'
import { FEATURES } from '@/lib/features/feature-config'
import { hasFeatureAccess } from '@/lib/features/feature-access'
import API_URL from '@/config/api'
import { TemplateAgent } from './types'

interface TemplatePreference {
  template_id: number
  template_name: string
  display_name: string
  description: string
  template_category: string
  is_premium_only: boolean
  is_enabled: boolean
  usage_count: number
  last_used_at: string | null
}

interface TemplateManagementViewProps {
  userId: number
  onClose: () => void
}

export default function TemplateManagementView({
  userId,
  onClose
}: TemplateManagementViewProps) {
  const [templates, setTemplates] = useState<TemplatePreference[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [changes, setChanges] = useState<Record<number, boolean>>({})
  const { toast } = useToast()
  const { subscription } = useUserSubscriptionStore()

  // Check if user has access to Custom Agents feature
  const hasCustomAgentsAccess = hasFeatureAccess('CUSTOM_AGENTS', subscription).hasAccess

  // Load user template preferences
  const loadTemplatePreferences = async () => {
    setLoading(true)
    try {
      const response = await fetch(`${API_URL}/templates/user/${userId}`)
      if (response.ok) {
        const data = await response.json()
        setTemplates(data)
        console.log('Loaded template preferences:', data)
      } else {
        console.error('Failed to load template preferences:', await response.text())
        toast({
          title: "Error",
          description: "Failed to load template preferences",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error loading template preferences:', error)
      toast({
        title: "Error",
        description: "An error occurred while loading preferences",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTemplatePreferences()
  }, [userId])

  // Handle toggle change
  const handleToggleChange = (templateId: number, enabled: boolean) => {
    setChanges(prev => ({
      ...prev,
      [templateId]: enabled
    }))
    
    // Update local state immediately for UI responsiveness
    setTemplates(prev => prev.map(template => 
      template.template_id === templateId 
        ? { ...template, is_enabled: enabled }
        : template
    ))
  }

  // Save all changes
  const saveChanges = async () => {
    if (Object.keys(changes).length === 0) {
      toast({
        title: "No Changes",
        description: "No changes to save",
      })
      return
    }

    setSaving(true)
    try {
      const preferences = Object.entries(changes).map(([templateId, isEnabled]) => ({
        template_id: parseInt(templateId),
        is_enabled: isEnabled
      }))

      const response = await fetch(`${API_URL}/templates/user/${userId}/bulk-toggle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          preferences
        }),
      })

      if (response.ok) {
        const result = await response.json()
        const successful = result.results.filter((r: any) => r.success).length
        const failed = result.results.filter((r: any) => !r.success).length

        if (failed === 0) {
          toast({
            title: "Preferences Saved!",
            description: `Successfully updated ${successful} template preferences`,
            duration: 3000,
          })
        } else {
          toast({
            title: "Partially Saved",
            description: `${successful} saved, ${failed} failed`,
            variant: "destructive",
          })
        }

        setChanges({})
        
        // Notify other components that preferences have been updated
        window.dispatchEvent(new CustomEvent('template-preferences-updated'))
        
      } else {
        const error = await response.text()
        console.error('Failed to save preferences:', error)
        toast({
          title: "Save Failed",
          description: "Failed to save template preferences",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error('Error saving preferences:', error)
      toast({
        title: "Error",
        description: "An error occurred while saving",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  // Get templates grouped by category
  const templatesByCategory = templates.reduce((acc, template) => {
    const category = template.template_category || 'Uncategorized'
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(template)
    return acc
  }, {} as Record<string, TemplatePreference[]>)

  const hasChanges = Object.keys(changes).length > 0
  const enabledCount = templates.filter(t => t.is_enabled).length
  const totalCount = templates.length

  if (loading) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center text-gray-500">
            <RefreshCw className="w-8 h-8 mx-auto mb-3 animate-spin text-[#FF7F7F]" />
            <p className="text-sm">Loading template preferences...</p>
          </div>
        </div>
      </div>
    )
  }

  // Show access restriction for non-premium users
  if (!hasCustomAgentsAccess) {
    return (
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 bg-gray-50 flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <Lock className="w-5 h-5 text-amber-600" />
              <div>
                <h3 className="font-semibold text-gray-900">Template Preferences</h3>
                <p className="text-sm text-gray-600">
                  Premium feature - Upgrade to manage template preferences
                </p>
              </div>
            </div>
            <Button
              onClick={onClose}
              variant="ghost"
              size="sm"
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </Button>
          </div>
        </div>

        {/* Access Restriction Content */}
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center max-w-md">
            <Lock className="w-16 h-16 mx-auto mb-4 text-amber-600" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Premium Feature</h3>
            <p className="text-gray-600 mb-4">
              Template preference management is available to premium subscribers. 
              You can still browse and use templates directly with @template_name.
            </p>
            <Alert className="bg-amber-50 border-amber-200">
              <Info className="w-4 h-4 text-amber-600" />
              <AlertDescription className="text-amber-800 text-sm">
                <strong>Good news:</strong> All templates are available for direct use! 
                Just type @template_name in your conversation to use any template agent.
              </AlertDescription>
            </Alert>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-gray-50 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <Settings className="w-5 h-5 text-[#FF7F7F]" />
            <div>
              <h3 className="font-semibold text-gray-900">Template Preferences</h3>
              <p className="text-sm text-gray-600">
                Control which agents are available to the planner
              </p>
            </div>
          </div>
          <Button
            onClick={onClose}
            variant="ghost"
            size="sm"
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </Button>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span>{enabledCount} enabled</span>
          </div>
          <div className="flex items-center gap-2">
            <XCircle className="w-4 h-4 text-gray-400" />
            <span>{totalCount - enabledCount} disabled</span>
          </div>
          <div className="text-gray-500">
            Total: {totalCount} templates
          </div>
        </div>

        {/* Info Alert */}
        <Alert className="mt-3 bg-[#FF7F7F]/12 border-[#FF7F7F]">
          <Info className="w-4 h-4 text-[#FF7F7F]" />
          <AlertDescription className="text-[#FF7F7F] text-sm">
            Enabled templates will be available to the AI planner when you don't mention a specific agent. 
            You can enable up to 10 templates for planner use (most used templates are prioritized).
            You can always use any template directly with @template_name.
          </AlertDescription>
        </Alert>

        {/* Save Button */}
        {hasChanges && (
          <div className="mt-3 flex justify-end">
            <Button
              onClick={saveChanges}
              disabled={saving}
              className="bg-[#FF7F7F] hover:bg-[#FF6666] text-white"
            >
              {saving ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save {Object.keys(changes).length} Changes
                </>
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {Object.entries(templatesByCategory).map(([category, categoryTemplates]) => (
          <div key={category} className="space-y-3">
            <h4 className="font-semibold text-sm text-gray-800 border-b border-gray-200 pb-1">
              {category}
              <span className="ml-2 text-xs font-normal text-gray-500">
                ({categoryTemplates.length})
              </span>
            </h4>
            
            <div className="space-y-2">
              {categoryTemplates.map((template) => (
                <motion.div
                  key={template.template_id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 border border-gray-200 rounded-lg hover:border-[#FF7F7F] transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h5 className="font-medium text-sm text-gray-900">
                          {template.display_name}
                        </h5>
                        <Badge variant="outline" className="text-xs text-[#FF7F7F] border-[#FF7F7F]">
                          Template
                        </Badge>
                        {template.is_premium_only && (
                          <Badge variant="outline" className="text-xs text-amber-600 border-amber-600">
                            Premium
                          </Badge>
                        )}
                      </div>
                      
                      <p className="text-xs text-gray-600 mb-2">
                        {template.description}
                      </p>
                      
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>@{template.template_name}</span>
                        <span>{template.usage_count} uses</span>
                        {template.last_used_at && (
                          <span>Last used: {new Date(template.last_used_at).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 ml-4">
                      <Switch
                        checked={template.is_enabled}
                        onCheckedChange={(checked) => handleToggleChange(template.template_id, checked)}
                        className="data-[state=checked]:bg-[#FF7F7F]"
                      />
                      <span className="text-xs text-gray-500 min-w-[60px]">
                        {template.is_enabled ? 'Enabled' : 'Disabled'}
                      </span>
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