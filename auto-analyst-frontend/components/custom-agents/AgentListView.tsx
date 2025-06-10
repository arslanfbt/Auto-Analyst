'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Settings, 
  Trash2, 
  Eye, 
  Calendar,
  TrendingUp,
  AlertCircle,
  Plus
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
  refreshTrigger: number;
}

export default function AgentListView({ 
  agents, 
  onSelectAgent, 
  onDeleteAgent,
  refreshTrigger 
}: AgentListViewProps) {
  const [deletingAgentId, setDeletingAgentId] = useState<number | null>(null);

  const handleDelete = async (agentId: number) => {
    setDeletingAgentId(agentId);
    try {
      await onDeleteAgent(agentId);
    } finally {
      setDeletingAgentId(null);
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
      <div className="space-y-3">
        {agents.map((agent) => (
          <Card key={agent.agent_id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <CardTitle className="text-base truncate">
                      {agent.display_name || agent.agent_name}
                    </CardTitle>
                    <Badge variant="secondary" className="text-xs">
                      @{agent.agent_name}
                    </Badge>
                  </div>
                  <CardDescription className="text-sm">
                    {truncateDescription(agent.description)}
                  </CardDescription>
                </div>
                
                <div className="flex items-center gap-1 ml-2">
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
                  {!agent.is_active && (
                    <div className="flex items-center gap-1 text-yellow-600">
                      <AlertCircle className="w-3 h-3" />
                      <span>Inactive</span>
                    </div>
                  )}
                  <div className={`w-2 h-2 rounded-full ${
                    agent.is_active ? 'bg-green-500' : 'bg-gray-400'
                  }`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="text-sm font-medium text-gray-700 mb-2">💡 Usage Tips</h4>
        <ul className="text-xs text-gray-600 space-y-1">
          <li>• Use your agents in chat by typing @agent_name followed by your query</li>
          <li>• Click the eye icon to view and edit agent details</li>
          <li>• Inactive agents won't appear in the agent selection menu</li>
        </ul>
      </div>
    </div>
  );
} 