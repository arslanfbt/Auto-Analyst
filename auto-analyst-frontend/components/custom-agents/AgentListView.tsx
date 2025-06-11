'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
  Settings, 
  Trash2, 
  Eye, 
  Calendar,
  TrendingUp,
  AlertCircle,
  Plus,
  Power,
  Info
} from 'lucide-react';
import { CustomAgentList } from './types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface AgentListViewProps {
  agents: CustomAgentList[];
  onSelectAgent: (agent: CustomAgentList) => void;
  onDeleteAgent: (agentId: number) => Promise<boolean>;
  onToggleActive: (agentId: number) => Promise<boolean>;
  getActiveCount: () => Promise<{ active_count: number; max_allowed: number; can_activate_more: boolean } | null>;
  refreshTrigger: number;
}

export default function AgentListView({ 
  agents, 
  onSelectAgent, 
  onDeleteAgent,
  onToggleActive,
  getActiveCount,
  refreshTrigger 
}: AgentListViewProps) {
  const [deletingAgentId, setDeletingAgentId] = useState<number | null>(null);
  const [togglingAgentId, setTogglingAgentId] = useState<number | null>(null);
  const [activeCount, setActiveCount] = useState<{ active_count: number; max_allowed: number; can_activate_more: boolean } | null>(null);

  // Load active count when component mounts or agents change
  useEffect(() => {
    const loadActiveCount = async () => {
      const count = await getActiveCount();
      setActiveCount(count);
    };
    
    loadActiveCount();
  }, [agents, refreshTrigger, getActiveCount]);

  const handleDelete = async (agentId: number) => {
    setDeletingAgentId(agentId);
    try {
      await onDeleteAgent(agentId);
    } finally {
      setDeletingAgentId(null);
    }
  };

  const handleToggleActive = async (agentId: number, currentStatus: boolean) => {
    setTogglingAgentId(agentId);
    try {
      const success = await onToggleActive(agentId);
      if (success) {
        // Refresh active count
        const count = await getActiveCount();
        setActiveCount(count);
      }
    } finally {
      setTogglingAgentId(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const truncateDescription = (description: string, maxLength: number = 120) => {
    if (description.length <= maxLength) return description;
    return description.substring(0, maxLength) + '...';
  };

  if (agents.length === 0) {
    return (
      <div className="p-4 h-full flex flex-col items-center justify-center text-center">
        <div className="max-w-sm">
          <Settings className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">No Custom Agents Yet</h3>
          <p className="text-gray-500 text-sm mb-6">
            Create your first custom agent to start building specialized AI assistants for your specific needs.
          </p>
          <div className="bg-red-50 p-4 rounded-lg border border-[#FF7F7F]/20">
            <h4 className="text-sm font-medium text-[#FF7F7F] mb-2">✨ Get Started</h4>
            <p className="text-xs text-gray-700">
              Custom agents allow you to create specialized AI assistants that understand your specific domain and can perform tailored analysis tasks.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 h-full overflow-y-auto">
      {/* Active Count Display */}
      {activeCount && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Power className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-900">
                Active Agents: {activeCount.active_count}/{activeCount.max_allowed}
              </span>
            </div>
            {!activeCount.can_activate_more && (
              <div className="flex items-center gap-1 text-orange-600">
                <Info className="w-3 h-3" />
                <span className="text-xs">Limit reached</span>
              </div>
            )}
          </div>
          <p className="text-xs text-blue-700 mt-1">
            {activeCount.can_activate_more 
              ? `You can activate ${activeCount.max_allowed - activeCount.active_count} more agents.`
              : "Deactivate some agents to activate others. Only active agents appear in chat suggestions."
            }
          </p>
        </div>
      )}

      <div className="space-y-3">
        {agents.map((agent) => (
          <Card key={agent.agent_id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  {/* Agent name on its own line */}
                  <div className="mb-2">
                    <CardTitle className="text-base break-words line-clamp-2 leading-tight">
                      {agent.display_name || agent.agent_name}
                    </CardTitle>
                  </div>
                  
                  {/* Badges on a separate line with flex wrap */}
                  <div className="flex items-center gap-1.5 flex-wrap mb-2">
                    <Badge variant="secondary" className="text-xs flex-shrink-0">
                      @{agent.agent_name}
                    </Badge>
                    {agent.is_active && (
                      <Badge variant="default" className="text-xs bg-green-100 text-green-800 border-green-200 flex-shrink-0">
                        Active
                      </Badge>
                    )}
                  </div>
                  
                  {/* Description */}
                  <CardDescription className="text-sm break-words leading-relaxed">
                    {truncateDescription(agent.description)}
                  </CardDescription>
                </div>
                
                {/* Action buttons - always on the right */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onSelectAgent(agent)}
                    className="h-8 w-8 p-0"
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                        disabled={deletingAgentId === agent.agent_id}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Custom Agent</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete "{agent.display_name || agent.agent_name}"? 
                          This action cannot be undone and the agent will no longer be available for use.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(agent.agent_id)}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          {deletingAgentId === agent.agent_id ? 'Deleting...' : 'Delete'}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="pt-0">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    <span>Created {formatDate(agent.created_at)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    <span>{agent.usage_count} uses</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {/* Active Toggle Switch - Compact positioning */}
                  <div className="flex items-center gap-1">
                    <Switch
                      checked={agent.is_active}
                      onCheckedChange={() => handleToggleActive(agent.agent_id, agent.is_active)}
                      disabled={
                        togglingAgentId === agent.agent_id || 
                        (!agent.is_active && activeCount?.can_activate_more === false)
                      }
                      className="data-[state=checked]:bg-[#FF7F7F] scale-[0.6] h-3 w-6"
                    />
                    <span className="text-[9px] text-gray-500 w-6 text-center">
                      {togglingAgentId === agent.agent_id ? '...' : (agent.is_active ? 'On' : 'Off')}
                    </span>
                  </div>
                  
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    agent.is_active ? 'bg-green-500' : 'bg-gray-400'
                  }`} />
                </div>
              </div>
              
              {/* Inactive status on separate line if needed */}
              {!agent.is_active && (
                <div className="flex items-center justify-end gap-1 text-yellow-600 text-xs mt-1">
                  <AlertCircle className="w-3 h-3" />
                  <span>Inactive</span>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
      
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="text-sm font-medium text-gray-700 mb-2">💡 Usage Tips</h4>
        <ul className="text-xs text-gray-600 space-y-1">
          <li>• Use toggle switches to activate/deactivate agents (max 10 active at once)</li>
          <li>• Use active agents in chat by typing @agent_name followed by your query</li>
          <li>• Click the eye icon to view and edit agent details</li>
          <li>• Only active agents appear in the agent selection menu</li>
        </ul>
      </div>
    </div>
  );
} 