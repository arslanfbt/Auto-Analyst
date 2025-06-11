'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
  ArrowLeft, 
  Edit, 
  Save, 
  X, 
  Calendar, 
  TrendingUp, 
  Settings2,
  Trash2,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { CustomAgent } from './types';
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

interface AgentDetailViewProps {
  agent: CustomAgent | null;
  onUpdateAgent: (agentId: number, updates: Partial<CustomAgent>) => Promise<boolean>;
  onDeleteAgent: (agentId: number) => Promise<boolean>;
  onToggleActive?: (agentId: number) => Promise<boolean>;
  onBack: () => void;
}

export default function AgentDetailView({ 
  agent, 
  onUpdateAgent, 
  onDeleteAgent, 
  onToggleActive,
  onBack 
}: AgentDetailViewProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedAgent, setEditedAgent] = useState<Partial<CustomAgent>>({});
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (agent) {
      setEditedAgent({
        display_name: agent.display_name,
        description: agent.description,
        prompt_template: agent.prompt_template,
        is_active: agent.is_active
      });
    }
  }, [agent]);

  if (!agent) {
    return (
      <div className="p-4 h-full flex flex-col items-center justify-center text-center">
        <Settings2 className="w-12 h-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-semibold text-gray-700 mb-2">No Agent Selected</h3>
        <p className="text-gray-500 text-sm">
          Select an agent from the list to view and edit its details.
        </p>
      </div>
    );
  }

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedAgent({
      display_name: agent.display_name,
      description: agent.description,
      prompt_template: agent.prompt_template,
      is_active: agent.is_active
    });
  };

  const handleSave = async () => {
    setIsUpdating(true);
    try {
      const success = await onUpdateAgent(agent.agent_id, editedAgent);
      if (success) {
        setIsEditing(false);
      }
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const success = await onDeleteAgent(agent.agent_id);
      if (success) {
        onBack();
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const handleInputChange = (field: keyof CustomAgent, value: string | boolean) => {
    setEditedAgent(prev => ({ ...prev, [field]: value }));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const canSave = () => {
    return (
      (editedAgent.description?.length || 0) >= 10 &&
      (editedAgent.prompt_template?.length || 0) >= 50
    );
  };

  return (
    <div className="p-4 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="p-2 flex-shrink-0 mt-1"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold break-words line-clamp-2">
              {agent.display_name || agent.agent_name}
            </h2>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge variant="secondary" className="text-xs">
                @{agent.agent_name}
              </Badge>
              <div className="flex items-center gap-2">
                <div className={`flex items-center gap-1 text-xs ${
                  agent.is_active ? 'text-green-600' : 'text-gray-500'
                }`}>
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    agent.is_active ? 'bg-green-500' : 'bg-gray-400'
                  }`} />
                  {agent.is_active ? 'Active' : 'Inactive'}
                </div>
                {!isEditing && onToggleActive && (
                  <Switch
                    checked={agent.is_active}
                    onCheckedChange={() => {
                      onToggleActive(agent.agent_id);
                    }}
                    className="data-[state=checked]:bg-[#FF7F7F] scale-75"
                  />
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {isEditing ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancelEdit}
                disabled={isUpdating}
                className="text-xs"
              >
                <X className="w-4 h-4 mr-1" />
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={!canSave() || isUpdating}
                className="bg-gradient-to-r from-[#FF7F7F] to-[#FF6666] hover:from-[#FF6666] hover:to-[#E55555] text-white text-xs"
              >
                <Save className="w-4 h-4 mr-1" />
                {isUpdating ? 'Saving...' : 'Save'}
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={handleEdit}
                className="text-xs"
              >
                <Edit className="w-4 h-4 mr-1" />
                Edit
              </Button>
              
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 text-xs"
                    disabled={isDeleting}
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
                      onClick={handleDelete}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      {isDeleting ? 'Deleting...' : 'Delete'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto space-y-4">
        {/* Metadata Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Agent Metadata</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-500 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="font-medium">Created</p>
                  <p className="text-gray-600 text-xs">{formatDate(agent.created_at)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-gray-500 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="font-medium">Usage Count</p>
                  <p className="text-gray-600 text-xs">{agent.usage_count} times</p>
                </div>
              </div>
            </div>
            
            {agent.updated_at !== agent.created_at && (
              <div className="text-xs text-gray-600 pt-2 border-t">
                Last updated: {formatDate(agent.updated_at)}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Agent Configuration */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Configuration</CardTitle>
            <CardDescription className="text-sm">
              Customize your agent's behavior and availability
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Active Status */}
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0 flex-1">
                <Label htmlFor="is_active" className="text-sm font-medium">Active Status</Label>
                <p className="text-xs text-gray-600 mt-1">
                  When active, this agent can be used in conversations
                </p>
              </div>
              <Switch
                id="is_active"
                checked={isEditing ? editedAgent.is_active : agent.is_active}
                onCheckedChange={(value) => handleInputChange('is_active', value)}
                disabled={!isEditing}
                className="flex-shrink-0"
              />
            </div>

            {/* Display Name */}
            <div>
              <Label htmlFor="display_name" className="text-sm font-medium">Display Name</Label>
              {isEditing ? (
                <Input
                  id="display_name"
                  value={editedAgent.display_name || ''}
                  onChange={(e) => handleInputChange('display_name', e.target.value)}
                  placeholder="User-friendly name for your agent"
                  className="mt-1 text-sm"
                />
              ) : (
                <div className="mt-1 p-2 bg-gray-50 rounded text-sm break-words">
                  {agent.display_name || <span className="text-gray-500 italic">No display name set</span>}
                </div>
              )}
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="description" className="text-sm font-medium">Description *</Label>
              {isEditing ? (
                <>
                  <Textarea
                    id="description"
                    value={editedAgent.description || ''}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    className="mt-1 min-h-[80px] text-sm resize-none"
                    maxLength={1000}
                  />
                  <div className="flex justify-between mt-1">
                    <p className="text-xs text-gray-500">
                      Helps users understand when to use this agent
                    </p>
                    <p className={`text-xs ${
                      (editedAgent.description?.length || 0) < 10 ? 'text-red-500' : 'text-gray-500'
                    }`}>
                      {editedAgent.description?.length || 0}/1000 (min: 10)
                    </p>
                  </div>
                </>
              ) : (
                <div className="mt-1 p-2 bg-gray-50 rounded text-sm break-words">
                  {agent.description}
                </div>
              )}
            </div>

            {/* Prompt Template */}
            <div>
              <Label htmlFor="prompt_template" className="text-sm font-medium">Agent Instructions *</Label>
              {isEditing ? (
                <>
                  <Textarea
                    id="prompt_template"
                    value={editedAgent.prompt_template || ''}
                    onChange={(e) => handleInputChange('prompt_template', e.target.value)}
                    className="mt-1 min-h-[150px] text-sm resize-none"
                  />
                  <div className="flex justify-between mt-1">
                    <p className="text-xs text-gray-500">
                      Define how your agent should behave and analyze data
                    </p>
                    <p className={`text-xs ${
                      (editedAgent.prompt_template?.length || 0) < 50 ? 'text-red-500' : 'text-gray-500'
                    }`}>
                      {editedAgent.prompt_template?.length || 0} characters (min: 50)
                    </p>
                  </div>
                </>
              ) : (
                <div className="mt-1 p-3 bg-gray-50 rounded text-sm max-h-40 overflow-y-auto">
                  <div className="whitespace-pre-wrap break-words font-mono text-xs leading-relaxed">
                    {agent.prompt_template}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {isEditing && (
          <div className="bg-red-50 p-3 rounded-lg border border-[#FF7F7F]/20">
            <div className="flex items-start gap-2">
              {canSave() ? (
                <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
              )}
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-800">
                  {canSave() ? 'Ready to save' : 'Missing required fields'}
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  {canSave() 
                    ? 'All required fields are properly filled.'
                    : 'Please ensure description (10+ chars) and instructions (50+ chars) meet requirements.'
                  }
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 