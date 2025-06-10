"use client"

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  X, 
  Settings, 
  ChevronRight,
  ChevronLeft,
  Crown,
  Lock,
  Bot
} from 'lucide-react'
import { Badge } from '../ui/badge'
import API_URL from '@/config/api'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { CustomAgent, CustomAgentCreate, CustomAgentList } from './types'
import { useSession } from 'next-auth/react'
import { useUserSubscriptionStore } from '@/lib/store/userSubscriptionStore'
import { useFeatureAccess } from '@/lib/hooks/useFeatureAccess'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog'
import { Button } from '../ui/button'
import Link from 'next/link'
import { useToast } from '../ui/use-toast'
import CreateAgentForm from './CreateAgentForm'
import AgentListView from './AgentListView'
import AgentDetailView from './AgentDetailView'

interface CustomAgentsSidebarProps {
  isOpen: boolean
  onClose: () => void
  userId?: number | null
  forceExpanded?: boolean
}

export default function CustomAgentsSidebar({ 
  isOpen, 
  onClose, 
  userId,
  forceExpanded = false
}: CustomAgentsSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  
  // Reset collapsed state only when initially opening with forceExpanded
  useEffect(() => {
    if (forceExpanded && isOpen) {
      setIsCollapsed(false)
    }
  }, [forceExpanded, isOpen])

  const [activeTab, setActiveTab] = useState<'create' | 'list' | 'details'>('list')
  const [customAgents, setCustomAgents] = useState<CustomAgentList[]>([])
  const [selectedAgent, setSelectedAgent] = useState<CustomAgent | null>(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const { data: session } = useSession()
  const { subscription } = useUserSubscriptionStore()
  const customAgentsAccess = useFeatureAccess('CUSTOM_AGENTS', subscription)
  const [showPremiumUpgradeModal, setShowPremiumUpgradeModal] = useState(false)
  const { toast } = useToast()
  
  // Check access immediately when sidebar opens
  useEffect(() => {
    if (isOpen && !customAgentsAccess.hasAccess) {
      setShowPremiumUpgradeModal(true)
    }
  }, [isOpen, customAgentsAccess.hasAccess])

  const forceUpdate = () => setRefreshTrigger(prev => prev + 1)

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

  // Load custom agents
  const loadCustomAgents = async () => {
    const currentUserId = getUserId()
    if (!currentUserId) return

    try {
      const response = await fetch(`${API_URL}/custom_agents?user_id=${currentUserId}`)
      if (response.ok) {
        const agents = await response.json()
        setCustomAgents(agents)
      } else {
        console.error('Failed to load custom agents:', await response.text())
      }
    } catch (error) {
      console.error('Error loading custom agents:', error)
    }
  }

  // Load agents when component mounts or user changes
  useEffect(() => {
    if (customAgentsAccess.hasAccess) {
      loadCustomAgents()
    }
  }, [refreshTrigger, customAgentsAccess.hasAccess, session])

  // Handle creating a new agent
  const handleCreateAgent = async (agentData: CustomAgentCreate): Promise<boolean> => {
    const currentUserId = getUserId()
    if (!currentUserId) {
      toast({
        title: "Error",
        description: "User not authenticated",
        variant: "destructive",
      })
      return false
    }

    try {
      const response = await fetch(`${API_URL}/custom_agents?user_id=${currentUserId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(agentData),
      })

      if (response.ok) {
        toast({
          title: "Success! 🎉",
          description: "Your custom agent has been created successfully.",
          duration: 5000,
        })
        forceUpdate()
        setActiveTab('list')
        return true
      } else {
        const error = await response.text()
        toast({
          title: "Creation Failed",
          description: error || "Failed to create custom agent",
          variant: "destructive",
        })
        return false
      }
    } catch (error) {
      console.error('Error creating custom agent:', error)
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      })
      return false
    }
  }

  // Handle selecting an agent for details
  const handleSelectAgent = async (agent: CustomAgentList) => {
    const currentUserId = getUserId()
    if (!currentUserId) return

    try {
      const response = await fetch(`${API_URL}/custom_agents/${agent.agent_id}?user_id=${currentUserId}`)
      if (response.ok) {
        const fullAgent = await response.json()
        setSelectedAgent(fullAgent)
        setActiveTab('details')
      } else {
        console.error('Failed to load agent details:', await response.text())
      }
    } catch (error) {
      console.error('Error loading agent details:', error)
    }
  }

  // Handle deleting an agent
  const handleDeleteAgent = async (agentId: number): Promise<boolean> => {
    const currentUserId = getUserId()
    if (!currentUserId) return false

    try {
      const response = await fetch(`${API_URL}/custom_agents/${agentId}?user_id=${currentUserId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast({
          title: "Deleted",
          description: "Custom agent deleted successfully",
        })
        forceUpdate()
        if (selectedAgent?.agent_id === agentId) {
          setSelectedAgent(null)
          setActiveTab('list')
        }
        return true
      } else {
        const error = await response.text()
        toast({
          title: "Delete Failed",
          description: error || "Failed to delete agent",
          variant: "destructive",
        })
        return false
      }
    } catch (error) {
      console.error('Error deleting agent:', error)
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      })
      return false
    }
  }

  // Handle updating an agent
  const handleUpdateAgent = async (agentId: number, updates: Partial<CustomAgent>): Promise<boolean> => {
    const currentUserId = getUserId()
    if (!currentUserId) return false

    try {
      const response = await fetch(`${API_URL}/custom_agents/${agentId}?user_id=${currentUserId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      })

      if (response.ok) {
        const updatedAgent = await response.json()
        setSelectedAgent(updatedAgent)
        toast({
          title: "Updated",
          description: "Custom agent updated successfully",
          duration: 3000,
        })
        forceUpdate()
        return true
      } else {
        const error = await response.text()
        toast({
          title: "Update Failed",
          description: error || "Failed to update agent",
          variant: "destructive",
          duration: 3000,
        })
        return false
      }
    } catch (error) {
      console.error('Error updating agent:', error)
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
        duration: 3000,
      })
      return false
    }
  }

  // Validate agent name availability
  const validateAgentName = async (agentName: string): Promise<boolean> => {
    const currentUserId = getUserId()
    if (!currentUserId) return false

    try {
      const response = await fetch(`${API_URL}/custom_agents/validate_name/${encodeURIComponent(agentName)}?user_id=${currentUserId}`)
      if (response.ok) {
        const result = await response.json()
        return result.is_available
      }
      return false
    } catch (error) {
      console.error('Error validating agent name:', error)
      return false
    }
  }

  if (!isOpen) return null

  return (
    <>
      {/* Minimized simple arrow */}
      {isCollapsed && isOpen && (
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'tween', duration: 0.3 }}
          className="fixed top-1/3 right-0 transform -translate-y-1/2 z-50"
        >
          <button
            onClick={() => setIsCollapsed(false)}
            className="bg-white shadow-lg border border-gray-200 rounded-l-md p-2 hover:bg-gray-50 transition-colors flex items-center"
            title="Expand Custom Agents"
          >
            <ChevronLeft className="w-4 h-4 text-[#FF7F7F]" />
            <div className="w-1 h-4 bg-[#FF7F7F] rounded-full ml-1" />
          </button>
        </motion.div>
      )}

      {/* Full sidebar */}
      {!isCollapsed && isOpen && (
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'tween', duration: 0.3 }}
          className="fixed top-0 right-0 h-full bg-white shadow-2xl z-50 flex flex-col border-l border-gray-200 w-96 overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b border-gray-200 bg-gray-50 flex-shrink-0">
            {!isCollapsed && (
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-[#FF7F7F]" />
                <h2 className="font-semibold text-sm text-gray-800">Custom Agents</h2>
                <Badge variant="secondary" className="text-xs">Premium</Badge>
              </div>
            )}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="p-1.5 rounded-md hover:bg-gray-200 transition-colors"
              >
                {isCollapsed ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
              <button
                onClick={onClose}
                className="p-1.5 rounded-md hover:bg-gray-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {!isCollapsed && (
            <>
              <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="flex-1 flex flex-col min-h-0">
                <TabsList className="grid w-full grid-cols-3 bg-gray-100 mx-3 mt-3 mb-2 flex-shrink-0">
                  <TabsTrigger value="list" className="text-xs">My Agents</TabsTrigger>
                  <TabsTrigger value="create" className="text-xs">Create New</TabsTrigger>
                  <TabsTrigger value="details" className="text-xs">
                    Details
                    {selectedAgent && (
                      <span className="ml-1 w-2 h-2 bg-[#FF7F7F] rounded-full"></span>
                    )}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="list" className="flex-1 min-h-0 overflow-hidden">
                  <AgentListView
                    agents={customAgents}
                    onSelectAgent={handleSelectAgent}
                    onDeleteAgent={handleDeleteAgent}
                    refreshTrigger={refreshTrigger}
                  />
                </TabsContent>

                <TabsContent value="create" className="flex-1 min-h-0 overflow-hidden">
                  <CreateAgentForm
                    onCreateAgent={handleCreateAgent}
                    onValidateAgentName={validateAgentName}
                  />
                </TabsContent>

                <TabsContent value="details" className="flex-1 min-h-0 overflow-hidden">
                  <AgentDetailView
                    agent={selectedAgent}
                    onUpdateAgent={handleUpdateAgent}
                    onDeleteAgent={handleDeleteAgent}
                    onBack={() => setActiveTab('list')}
                  />
                </TabsContent>
              </Tabs>
            </>
          )}
        </motion.div>
      )}
      
      {/* Premium Upgrade Modal */}
      <Dialog open={showPremiumUpgradeModal} onOpenChange={setShowPremiumUpgradeModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Crown className="w-6 h-6 text-yellow-500" />
              Custom Agents - Premium Feature
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-red-50 to-orange-50 rounded-lg border border-[#FF7F7F]/20">
              <Lock className="w-6 h-6 text-[#FF7F7F]" />
              <div>
                <h4 className="font-semibold text-gray-900 text-base">Upgrade Required</h4>
                <p className="text-base text-gray-700 mt-1">
                  You need to upgrade to the standard tier to use this. Create specialized AI agents for your workflows.
                </p>
              </div>
            </div>
            
            <div className="space-y-3">
              <h5 className="font-semibold text-gray-900 text-base">What you can do:</h5>
              <ul className="text-base text-gray-700 space-y-2 ml-4">
                <li>• Create specialized agents for different tasks (e.g., pytorch_agent, data_cleaning_agent).</li>
                <li>• Define custom prompts and behavior for your agents.</li>
                <li>• Use your agents with @agent_name mentions in chat.</li>
              </ul>
            </div>
            <div className="flex gap-3 pt-4">
              <Link href="/pricing" className="flex-1">
                <Button className="w-full bg-gradient-to-r from-[#FF7F7F] to-[#FF6666] hover:from-[#FF6666] hover:to-[#E55555] text-white">
                  <Crown className="w-4 h-4 mr-2" />
                  Upgrade Now
                </Button>
              </Link>
              <Button 
                variant="outline" 
                onClick={() => setShowPremiumUpgradeModal(false)}
                className="px-6"
              >
                Maybe Later
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
} 