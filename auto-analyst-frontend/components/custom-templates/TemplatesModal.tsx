"use client"

import React, { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  X, 
  Search, 
  Filter, 
  Settings, 
  Library, 
  Sparkles, 
  Lock,
  RefreshCw,
  CheckCircle,
  XCircle,
  Info,
  Star,
  TrendingUp,
  Save,
  MessageSquare
} from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { Switch } from '../ui/switch'
import { Badge } from '../ui/badge'
import { ScrollArea } from '../ui/scroll-area'
import { useToast } from '../ui/use-toast'
import { Alert, AlertDescription } from '../ui/alert'
import { useUserSubscriptionStore } from '@/lib/store/userSubscriptionStore'
import { hasFeatureAccess } from '@/lib/features/feature-access'
import API_URL from '@/config/api'
import { TemplateAgent, TemplatePreference } from './types'
import TemplateCard from './TemplateCard'
import FeedbackPopup from '../chat/FeedbackPopup'

interface TemplatesModalProps {
  isOpen: boolean
  onClose: () => void
  userId: number
}

export default function TemplatesModal({
  isOpen,
  onClose,
  userId
}: TemplatesModalProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'enabled' | 'disabled'>('all')
  const [templates, setTemplates] = useState<TemplateAgent[]>([])
  const [preferences, setPreferences] = useState<TemplatePreference[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [changes, setChanges] = useState<Record<number, boolean>>({})
  const [showFeedbackPopup, setShowFeedbackPopup] = useState(false)
  const { toast } = useToast()
  const { subscription } = useUserSubscriptionStore()

  // Check if user has access
  const hasAccess = hasFeatureAccess('CUSTOM_AGENTS', subscription).hasAccess

  // Load templates for free users (view-only, no preferences)
  const loadTemplatesForFreeUsers = async () => {
    setLoading(true)
    try {
      // Fetch all planner templates (no user-specific data needed for free users)
      const response = await fetch(`${API_URL}/templates/?variant_type=planner`).catch(err => {
        throw new Error(`Templates endpoint failed: ${err.message}`)
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Failed to load templates: ${response.status} ${response.statusText} - ${errorText}`)
      }

      const templatesData = await response.json().catch(err => {
        throw new Error(`Failed to parse templates response: ${err.message}`)
      })
      
      setTemplates(templatesData)
      setPreferences([]) // No preferences for free users
      setChanges({})
    } catch (error) {
      console.error('Error loading templates:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load agents",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Load templates and preferences
  const loadData = async () => {
    setLoading(true)
    try {
      // Fetch global template data with global usage counts (planner variants only for modal)
      const [templatesResponse, preferencesResponse] = await Promise.all([
        fetch(`${API_URL}/templates/?variant_type=planner`).catch(err => {
          throw new Error(`Templates endpoint failed: ${err.message}`)
        }), // Global planner templates with global usage counts
        fetch(`${API_URL}/templates/user/${userId}?variant_type=planner`).catch(err => {
          throw new Error(`Preferences endpoint failed: ${err.message}`)
        }) // User preferences for planner variants
      ])

      // Check templates response
      if (!templatesResponse.ok) {
        const errorText = await templatesResponse.text()
        throw new Error(`Failed to load templates: ${templatesResponse.status} ${templatesResponse.statusText} - ${errorText}`)
      }

      // Check preferences response
      if (!preferencesResponse.ok) {
        const errorText = await preferencesResponse.text()
        throw new Error(`Failed to load preferences: ${preferencesResponse.status} ${preferencesResponse.statusText} - ${errorText}`)
      }

      // Parse templates response
      const globalTemplatesData = await templatesResponse.json().catch(err => {
        throw new Error(`Failed to parse templates response: ${err.message}`)
      })
      
      // Convert to TemplateAgent format with global usage counts
      const templatesData = globalTemplatesData.map((item: any) => ({
        template_id: item.template_id,
        template_name: item.template_name,
        display_name: item.display_name,
        description: item.description,
        prompt_template: item.prompt_template,
        template_category: item.template_category,
        icon_url: item.icon_url,
        is_premium_only: item.is_premium_only,
        is_active: item.is_active,
        usage_count: item.usage_count, // Global usage count from /templates/ endpoint
        created_at: item.created_at
      }))
      setTemplates(templatesData)

      // Parse preferences response
      const userPreferencesData = await preferencesResponse.json().catch(err => {
        throw new Error(`Failed to parse preferences response: ${err.message}`)
      })
      
      const preferencesData = userPreferencesData.map((item: any) => ({
        template_id: item.template_id,
        template_name: item.template_name,
        display_name: item.display_name,
        description: item.description,
        template_category: item.template_category,
        icon_url: item.icon_url,
        is_premium_only: item.is_premium_only,
        is_enabled: item.is_enabled,
        usage_count: item.usage_count, // Keep user-specific usage for preferences if needed
        last_used_at: item.last_used_at
      }))
      setPreferences(preferencesData)

      // Reset changes when loading data
      setChanges({})
    } catch (error) {
      console.error('Error loading data:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load agents",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen) {
      if (hasAccess) {
        loadData() // Load with preferences for premium users
      } else {
        loadTemplatesForFreeUsers() // Load templates only for free users
      }
    }
  }, [isOpen, hasAccess, userId])

  // Get template preference
  const getTemplatePreference = (templateId: number) => {
    return preferences.find(p => p.template_id === templateId)
  }

  // Helper function to determine if a template should be enabled by default
  const isDefaultEnabledTemplate = (templateName: string) => {
    const defaultAgentNames = [
      "preprocessing_agent",
      "statistical_analytics_agent", 
      "sk_learn_agent",
      "data_viz_agent"
    ]
    return defaultAgentNames.includes(templateName)
  }

  // Helper function to get the effective enabled state for a template
  const getTemplateEnabledState = (template: TemplateAgent) => {
    const preference = getTemplatePreference(template.template_id)
    const defaultEnabled = isDefaultEnabledTemplate(template.template_name)
    
    return changes[template.template_id] !== undefined 
      ? changes[template.template_id] 
      : preference?.is_enabled ?? defaultEnabled
  }

  // Filter templates based on search, category, and status
  const filteredTemplates = useMemo(() => {
    let filtered = templates

    if (searchQuery) {
      filtered = filtered.filter(template =>
        template.display_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.template_category.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(template => template.template_category === selectedCategory)
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(template => {
        const isEnabled = getTemplateEnabledState(template)
        return statusFilter === 'enabled' ? isEnabled : !isEnabled
      })
    }

    return filtered
  }, [templates, searchQuery, selectedCategory, statusFilter, preferences, changes])

  // Get categories
  const categories = useMemo(() => {
    const cats = Array.from(new Set(templates.map(t => t.template_category)))
    return ['all', ...cats.sort()]
  }, [templates])

  // Handle preference toggle
  const handleToggleChange = (templateId: number, enabled: boolean) => {
    // Safety check: Don't allow undefined templateId
    if (templateId === undefined || templateId === null) {
      console.error('ERROR: templateId is undefined/null, cannot toggle template')
      return
    }
    
    // Track unsaved changes
    setChanges(prev => ({
      ...prev,
      [templateId]: enabled
    }))
    
    // Update preferences if the preference exists
    setPreferences(prev => {
      const existingPrefIndex = prev.findIndex(p => p.template_id === templateId)
      
      // If preference exists, update it
      if (existingPrefIndex >= 0) {
        return prev.map(pref => 
          pref.template_id === templateId 
            ? { ...pref, is_enabled: enabled }
            : pref
        )
      }
      
      // If preference doesn't exist yet, create a new one for this template
      const template = templates.find(t => t.template_id === templateId)
      if (template) {
        const newPref: TemplatePreference = {
          template_id: templateId,
          template_name: template.template_name,
          display_name: template.display_name,
          description: template.description,
          template_category: template.template_category,
          icon_url: template.icon_url,
          is_premium_only: template.is_premium_only,
          is_enabled: enabled,
          usage_count: template.usage_count || 0,
          last_used_at: null,
        }
        return [...prev, newPref]
      }
      
      return prev
    })
  }

  // Save changes
  const saveChanges = async () => {
    if (Object.keys(changes).length === 0) return

    setSaving(true)
    try {
      const preferencesToUpdate = Object.entries(changes).map(([templateId, isEnabled]) => ({
        template_id: parseInt(templateId),
        is_enabled: isEnabled
      }))

      const response = await fetch(`${API_URL}/templates/user/${userId}/bulk-toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferences: preferencesToUpdate }),
      })

      if (response.ok) {
        toast({
          title: "Settings Saved!",
          description: `Updated template preferences`,
          duration: 3000,
        })
        setChanges({})
        window.dispatchEvent(new CustomEvent('template-preferences-updated'))
      } else {
        throw new Error('Failed to save preferences')
      }
    } catch (error) {
      console.error('Error saving preferences:', error)
      toast({
        title: "Save Failed",
        description: "Failed to save template preferences",
        variant: "destructive",
        duration: 5000,
      })
    } finally {
      setSaving(false)
    }
  }

  // Get template data for rendering
  const getTemplateData = (template: TemplateAgent) => {
    const preference = getTemplatePreference(template.template_id)
    const isEnabled = getTemplateEnabledState(template)
    
    return { preference, isEnabled }
  }

  // Calculate enabled count including pending changes
  const getEnabledCountWithChanges = () => {
    let count = 0
    templates.forEach(template => {
      const isCurrentlyEnabled = getTemplateEnabledState(template)
      if (isCurrentlyEnabled) {
        count++
      }
    })
    return count
  }

  // Check if disabling this template would leave user with 0 templates
  const wouldLeaveZeroTemplates = (templateId: number) => {
    const currentEnabledCount = getEnabledCountWithChanges()
    const templateCurrentlyEnabled = getTemplateEnabledState(templates.find(t => t.template_id === templateId)!)
    
    // If this template is currently enabled and it's the only one, disabling it would leave 0
    return templateCurrentlyEnabled && currentEnabledCount === 1
  }

  // Check if enabling this template would exceed the 10 template limit
  const wouldExceedMaxTemplates = (templateId: number) => {
    const currentEnabledCount = getEnabledCountWithChanges()
    const templateCurrentlyEnabled = getTemplateEnabledState(templates.find(t => t.template_id === templateId)!)
    
    // If this template is currently disabled and enabling it would exceed 10
    return !templateCurrentlyEnabled && currentEnabledCount >= 10
  }

  const enabledCount = hasAccess 
    ? getEnabledCountWithChanges()
    : 0

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl w-[95vw] h-[85vh] p-0 flex flex-col overflow-hidden">
        <DialogHeader className="p-6 pb-4 flex-shrink-0 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-xl font-semibold">
              <Library className="w-6 h-6 text-[#FF7F7F]" />
              Add Agents
            </DialogTitle>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="text-sm font-medium">
                {hasAccess 
                  ? `${enabledCount} of ${templates.length} enabled`
                  : `${templates.length} agents available`
                }
              </Badge>
              {!hasAccess && (
                <Badge variant="outline" className="text-sm border-[#FF7F7F]/40 text-[#FF7F7F] bg-[#FF7F7F]/10">
                  <Lock className="w-3 h-3 mr-1" />
                  Premium Required
                </Badge>
              )}
              {Object.keys(changes).length > 0 && (
                <Button
                  onClick={saveChanges}
                  disabled={saving}
                  size="sm"
                  className="bg-[#FF7F7F] hover:bg-[#FF7F7F]/90 h-8 text-sm px-4"
                >
                  {saving ? (
                    <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col min-h-0">
          {/* Filters Section */}
          <div className="px-6 py-4 border-b bg-gray-50/50 flex-shrink-0">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search agents..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-10 text-sm"
                />
              </div>
              
              <div className="flex gap-3">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-3 py-2 border rounded-md text-sm h-10 min-w-[140px] bg-white"
                >
                  {categories.map(category => (
                    <option key={category} value={category}>
                      {category === 'all' ? 'All Categories' : category}
                    </option>
                  ))}
                </select>
                
                {hasAccess && (
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as 'all' | 'enabled' | 'disabled')}
                    className="px-3 py-2 border rounded-md text-sm h-10 min-w-[120px] bg-white"
                  >
                    <option value="all">All Status</option>
                    <option value="enabled">Active Only</option>
                    <option value="disabled">Inactive Only</option>
                  </select>
                )}
              </div>
            </div>
          </div>

          {/* Premium Upgrade Prompt for Free Users */}
          {!hasAccess && (
            <div className="mx-6 mt-4 mb-2">
              <div className="bg-gradient-to-r from-[#FF7F7F]/10 to-[#FF7F7F]/5 border border-[#FF7F7F]/30 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-[#FF7F7F]/20 rounded-full">
                      <Sparkles className="w-5 h-5 text-[#FF7F7F]" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 text-sm">Unlock Premium Agents</h3>
                      <p className="text-xs text-gray-600 mt-0.5">
                        Enable and manage professional AI agents for enhanced productivity
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={() => window.open('/account', '_blank')}
                    size="sm"
                    className="bg-[#FF7F7F] hover:bg-[#FF7F7F]/90 text-white text-sm px-6 py-2"
                  >
                    Upgrade Now
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Content Section - Fixed height with scroll */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-6 min-h-[300px]">
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <RefreshCw className="w-8 h-8 animate-spin text-[#FF7F7F]" />
                  <span className="ml-3 text-base text-gray-600">Loading agents...</span>
                </div>
              ) : (
                <>
                  {filteredTemplates.length === 0 ? (
                    <div className="text-center py-8">
                      <Library className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                      <p className="text-lg text-gray-600 mb-2">No agents found</p>
                      {hasAccess ? (
                        <div className="space-y-3">
                          <p className="text-sm text-gray-500">Try adjusting your search or filters</p>
                          
                          {/* Request new agent section for premium users */}
                          <div className="bg-gradient-to-r from-[#FF7F7F]/10 to-[#FF7F7F]/5 border border-[#FF7F7F]/30 rounded-lg p-4 max-w-sm mx-auto">
                            <div className="flex items-center gap-2 mb-3">
                              <div className="p-1.5 bg-[#FF7F7F]/20 rounded-full">
                                <MessageSquare className="w-4 h-4 text-[#FF7F7F]" />
                              </div>
                              <div>
                                <h3 className="font-semibold text-gray-900 text-sm">Need a specific agent?</h3>
                                <p className="text-xs text-gray-600">Can't find what you're looking for?</p>
                              </div>
                            </div>
                            <Button
                              onClick={() => setShowFeedbackPopup(true)}
                              size="sm"
                              className="w-full bg-[#FF7F7F] hover:bg-[#FF7F7F]/90 text-white text-sm h-8"
                            >
                              <MessageSquare className="w-4 h-4 mr-2" />
                              Request New Agent
                            </Button>
                            <p className="text-xs text-gray-500 mt-2 text-center">
                              Tell us what kind of agent would help your workflow
                            </p>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">Try adjusting your search or filters</p>
                      )}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                      {filteredTemplates.map(template => {
                        const { preference, isEnabled } = getTemplateData(template)
                        const isLastTemplate = wouldLeaveZeroTemplates(template.template_id)
                        const wouldExceedMax = wouldExceedMaxTemplates(template.template_id)
                        
                        return (
                          <TemplateCard
                            key={template.template_id}
                            template={template}
                            preference={preference}
                            isEnabled={isEnabled}
                            hasAccess={hasAccess}
                            isLastTemplate={isLastTemplate}
                            wouldExceedMax={wouldExceedMax}
                            onToggleChange={handleToggleChange}
                          />
                        )
                      })}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Footer info */}
          <div className="px-6 py-4 border-t bg-gray-50/50 flex-shrink-0">
            <Alert className={hasAccess ? "border-[#FF7F7F]/30 bg-[#FF7F7F]/5" : "border-[#FF7F7F]/30 bg-[#FF7F7F]/5"}>
              <Info className={`h-4 w-4 text-[#FF7F7F]`} />
              <AlertDescription className="text-sm">
                {hasAccess 
                  ? (
                    <>
                      <span className="text-gray-700">
                        Use the toggle switches to enable/disable agents to be used by planner. You can use any agent directly with @agent_name.
                        <br />
                        {enabledCount === 1 && (
                          <span className="text-gray-600 font-medium">
                            {' '}Note: At least one agent must remain active.
                          </span>
                        )}
                        {enabledCount >= 10 && (
                          <span className="text-gray-600 font-medium">
                            {' '}Note: You have reached the maximum of 10 active agents.
                          </span>
                        )}
                      </span>
                      {Object.keys(changes).length > 0 && (
                        <span className="text-[#FF7F7F] font-medium">
                          {' '}You have unsaved changes. Click the save button to save your changes.
                        </span>
                      )}
                      {/* TODO: Add feedback popup for requesting new agents - currently its too much space*/}
                      {/* <div className="mt-2 pt-2 border-t border-[#FF7F7F]/20">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-600">
                            Can't find the agent you need?
                          </span>
                          <Button
                            onClick={() => setShowFeedbackPopup(true)}
                            size="sm"
                            variant="outline"
                            className="text-xs h-6 px-3 border-[#FF7F7F]/40 text-[#FF7F7F] hover:bg-[#FF7F7F]/10"
                          >
                            <MessageSquare className="w-3 h-3 mr-1" />
                            Request Agent
                          </Button>
                        </div> */}
                      {/* </div> */}
                    </>
                  ) : (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-700">
                        <strong className="text-[#FF7F7F]">Premium Feature:</strong> Upgrade to enable/disable agents for the planner. 
                        All agents are still available for direct use with @agent_name.
                      </span>
                      <Button
                        onClick={() => window.open('/account', '_blank')}
                        size="sm"
                        className="ml-4 bg-[#FF7F7F] hover:bg-[#FF7F7F]/90 text-white text-xs px-4 py-1.5 h-auto"
                      >
                        Upgrade to Premium
                      </Button>
                    </div>
                  )
                }
              </AlertDescription>
            </Alert>
          </div>
        </div>
      </DialogContent>
      
      {/* Feedback Popup for requesting new agents */}
      <FeedbackPopup 
        isOpen={showFeedbackPopup}
        onClose={() => setShowFeedbackPopup(false)}
      />
    </Dialog>
  )
} 