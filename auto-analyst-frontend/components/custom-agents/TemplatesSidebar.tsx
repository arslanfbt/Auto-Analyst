"use client"

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  X, 
  ChevronRight,
  ChevronLeft,
  Library,
  Settings
} from 'lucide-react'
import API_URL from '@/config/api'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { Button } from '../ui/button'
import { TemplatesByCategory, TemplateAgent } from './types'
import { useSession } from 'next-auth/react'
import { useUserSubscriptionStore } from '@/lib/store/userSubscriptionStore'
import { hasFeatureAccess } from '@/lib/features/feature-access'
import TemplateListView from './TemplateListView'
import TemplateDetailView from './TemplateDetailView'
import TemplateManagementView from './TemplateManagementView'

interface TemplatesSidebarProps {
  isOpen: boolean
  onClose: () => void
  userId?: number | null
  forceExpanded?: boolean
}

export default function TemplatesSidebar({ 
  isOpen, 
  onClose, 
  userId,
  forceExpanded = false
}: TemplatesSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  
  // Reset collapsed state only when initially opening with forceExpanded
  useEffect(() => {
    if (forceExpanded && isOpen) {
      setIsCollapsed(false)
    }
  }, [forceExpanded, isOpen])

  const [activeTab, setActiveTab] = useState<'templates' | 'template-details' | 'management'>('templates')
  const [templateAgents, setTemplateAgents] = useState<TemplatesByCategory[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateAgent | null>(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const { data: session } = useSession()
  const { subscription } = useUserSubscriptionStore()

  const forceUpdate = () => setRefreshTrigger(prev => prev + 1)

  // Check if user has access to Custom Agents feature for management
  const hasCustomAgentsAccess = hasFeatureAccess('CUSTOM_AGENTS', subscription).hasAccess

  // Extract user ID from session
  const getUserId = (): number | null => {
    if (userId) return userId
    if (session?.user) {
      if ((session.user as any).sub) {
        return parseInt((session.user as any).sub)
      } else if ((session.user as any).id) {
        return parseInt((session.user as any).id)
      }
    }
    return null
  }

  // Load template agents
  const loadTemplateAgents = async () => {
    try {
      const response = await fetch(`${API_URL}/templates/categories`)
      if (response.ok) {
        const templateCategories = await response.json()
        console.log('Template categories:', templateCategories)
        setTemplateAgents(templateCategories)
      } else {
        console.error('Failed to load template agents:', await response.text())
      }
    } catch (error) {
      console.error('Error loading template agents:', error)
    }
  }

  // Load templates when component mounts
  useEffect(() => {
    if (isOpen) {
    loadTemplateAgents()
    }
  }, [refreshTrigger, isOpen])

  // Handle selecting a template for details
  const handleSelectTemplate = (template: TemplateAgent) => {
    setSelectedTemplate(template)
    setActiveTab('template-details')
  }



  // Track template usage when viewing details
  const trackTemplateUsage = async (templateId: number): Promise<void> => {
    try {
      // For now, we'll skip usage tracking since the new templates system doesn't have this endpoint
      // This can be implemented later if needed
      console.log(`Template ${templateId} viewed by user ${getUserId()}`)
    } catch (error) {
      console.error('Error tracking template usage:', error)
    }
  }

  // Handle template selection with tracking
  const handleSelectTemplateWithTracking = (template: TemplateAgent) => {
    trackTemplateUsage(template.agent_id)
    handleSelectTemplate(template)
  }



  const handleBack = () => {
    setSelectedTemplate(null)
    setActiveTab('templates')
  }

  if (!isOpen) return null

  return (
    <>
        <motion.div
          initial={{ x: '100%' }}
        animate={{ x: isOpen ? (isCollapsed ? 'calc(100% - 60px)' : '0%') : '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed right-0 top-0 h-full bg-white border-l border-gray-200 shadow-xl z-[100] flex"
        style={{ width: isCollapsed ? '60px' : '800px' }}
      >
        {/* Collapsed View */}
        {isCollapsed && (
          <div className="w-full flex flex-col items-center py-4 space-y-4">
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          <button
            onClick={() => setIsCollapsed(false)}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
          >
              <ChevronLeft className="w-5 h-5" />
          </button>
            <div className="flex flex-col items-center space-y-2 text-gray-400">
              <Library className="w-6 h-6" />
              <span className="text-xs font-medium transform -rotate-90 whitespace-nowrap origin-center">
                Templates
              </span>
            </div>
          </div>
        )}

        {/* Expanded View */}
        {!isCollapsed && (
          <div className="flex-1 flex flex-col h-full">
          {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center gap-3">
                <Library className="w-6 h-6 text-[#FF7F7F]" />
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Agent Templates</h2>
                  <p className="text-sm text-gray-600">Professional AI agent templates</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {hasCustomAgentsAccess && (
                  <Button
                    onClick={() => setActiveTab('management')}
                    variant="ghost"
                    size="sm"
                    className="text-gray-600 hover:text-[#FF7F7F] hover:bg-red-50"
                    title="Manage preferences"
                  >
                    <Settings className="w-4 h-4" />
                  </Button>
                )}
              <button
                  onClick={() => setIsCollapsed(true)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                  title="Collapse sidebar"
              >
                  <ChevronRight className="w-5 h-5" />
              </button>
              <button
                onClick={onClose}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                  title="Close sidebar"
              >
                  <X className="w-5 h-5" />
              </button>
            </div>
          </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden">
              <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="h-full flex flex-col">
                {activeTab !== 'template-details' && activeTab !== 'management' && (
                  <TabsList className="grid w-full grid-cols-1 bg-gray-50 border-b border-gray-200 rounded-none h-12">
                    <TabsTrigger 
                      value="templates" 
                      className="data-[state=active]:bg-white data-[state=active]:border-b-2 data-[state=active]:border-[#FF7F7F] rounded-none"
                    >
                      <Library className="w-4 h-4 mr-2" />
                      Browse Templates
                  </TabsTrigger>
                </TabsList>
                )}

                <div className="flex-1 overflow-hidden">
                  <TabsContent value="templates" className="h-full m-0 p-0">
                  <TemplateListView
                    templateCategories={templateAgents}
                      onSelectTemplate={handleSelectTemplateWithTracking}
                  />
                </TabsContent>

                  <TabsContent value="template-details" className="h-full m-0 p-0">
                  <TemplateDetailView
                    template={selectedTemplate}
                      onBack={handleBack}
                  />
                </TabsContent>

                  <TabsContent value="management" className="h-full m-0 p-0">
                    <TemplateManagementView
                      userId={getUserId() || 1}
                      onClose={() => setActiveTab('templates')}
                    />
                  </TabsContent>
                    </div>
              </Tabs>
            </div>
          </div>
        )}
      </motion.div>


    </>
  )
} 