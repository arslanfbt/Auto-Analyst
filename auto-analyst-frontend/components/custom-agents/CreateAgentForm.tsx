'use client';

import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, CheckCircle, ArrowRight, ArrowLeft, Sparkles, Wand2, Loader2 } from 'lucide-react';
import { CustomAgentCreate, AgentFormStep } from './types';
import { debounce } from 'lodash';
import API_URL from '@/config/api';

interface CreateAgentFormProps {
  onCreateAgent: (agent: CustomAgentCreate) => Promise<boolean>;
  onValidateAgentName: (name: string) => Promise<boolean>;
}

interface InstructionGeneratorState {
  category: string;
  requirements: string;
  isGenerating: boolean;
  showGenerator: boolean;
}

export default function CreateAgentForm({ onCreateAgent, onValidateAgentName }: CreateAgentFormProps) {
  const [currentStep, setCurrentStep] = useState<AgentFormStep>('name');
  const [formData, setFormData] = useState<CustomAgentCreate>({
    agent_name: '',
    display_name: '',
    description: '',
    prompt_template: ''
  });
  
  const [nameValidation, setNameValidation] = useState<{
    isValid: boolean;
    isChecking: boolean;
    message: string;
  }>({
    isValid: false,
    isChecking: false,
    message: ''
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [instructionGenerator, setInstructionGenerator] = useState<InstructionGeneratorState>({
    category: '',
    requirements: '',
    isGenerating: false,
    showGenerator: false
  });

  // Generate instructions using the backend API
  const generateInstructions = async () => {
    if (!instructionGenerator.category || !instructionGenerator.requirements) {
      return;
    }

    setInstructionGenerator(prev => ({ ...prev, isGenerating: true }));

    try {
      const response = await fetch(`${API_URL}/custom_agents/generate_instructions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          category: instructionGenerator.category,
          user_requirements: instructionGenerator.requirements
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to generate instructions: ${response.statusText}`);
      }

      const data = await response.json();
      setFormData(prev => ({ ...prev, prompt_template: data.agent_instructions }));
      setInstructionGenerator(prev => ({ ...prev, showGenerator: false }));
    } catch (error) {
      console.error('Error generating instructions:', error);
      // TODO: Show error toast
    } finally {
      setInstructionGenerator(prev => ({ ...prev, isGenerating: false }));
    }
  };

  // Debounced name validation
  const validateName = useCallback(
    debounce(async (name: string) => {
      if (!name || name.length < 3) {
        setNameValidation({
          isValid: false,
          isChecking: false,
          message: name.length > 0 && name.length < 3 ? 'Name must be at least 3 characters' : ''
        });
        return;
      }

      setNameValidation(prev => ({ ...prev, isChecking: true }));
      
      const isValid = /^[a-zA-Z0-9_]+$/.test(name);
      if (!isValid) {
        setNameValidation({
          isValid: false,
          isChecking: false,
          message: 'Name can only contain letters, numbers, and underscores'
        });
        return;
      }

      try {
        const isAvailable = await onValidateAgentName(name);
        setNameValidation({
          isValid: isAvailable,
          isChecking: false,
          message: isAvailable ? 'Name is available!' : 'Name already exists'
        });
      } catch (error) {
        setNameValidation({
          isValid: false,
          isChecking: false,
          message: 'Error checking name availability'
        });
      }
    }, 500),
    [onValidateAgentName]
  );

  const handleInputChange = (field: keyof CustomAgentCreate, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    if (field === 'agent_name') {
      validateName(value);
    }
  };

  const canProceedFromStep = (step: AgentFormStep): boolean => {
    switch (step) {
      case 'name':
        return nameValidation.isValid && formData.agent_name.length >= 3;
      case 'description':
        return formData.description.length >= 10;
      case 'prompt':
        return formData.prompt_template.length >= 50;
      case 'review':
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    const steps: AgentFormStep[] = ['name', 'description', 'prompt', 'review'];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1]);
    }
  };

  const handlePrevious = () => {
    const steps: AgentFormStep[] = ['name', 'description', 'prompt', 'review'];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1]);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const success = await onCreateAgent(formData);
      if (success) {
        // Reset form
        setFormData({
          agent_name: '',
          display_name: '',
          description: '',
          prompt_template: ''
        });
        setCurrentStep('name');
        setNameValidation({ isValid: false, isChecking: false, message: '' });
        setInstructionGenerator({
          category: '',
          requirements: '',
          isGenerating: false,
          showGenerator: false
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 'name':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="agent_name">Agent Name *</Label>
              <Input
                id="agent_name"
                placeholder="e.g., pytorch_agent, sales_analyzer"
                value={formData.agent_name}
                onChange={(e) => handleInputChange('agent_name', e.target.value)}
                className={`mt-1 ${
                  formData.agent_name && !nameValidation.isValid ? 'border-red-300 focus:border-red-400' : 
                  nameValidation.isValid ? 'border-green-500 focus:border-green-500' : ''
                }`}
              />
              {nameValidation.isChecking && (
                <p className="text-sm text-[#FF7F7F] mt-1">Checking availability...</p>
              )}
              {nameValidation.message && (
                <div className={`flex items-center gap-1 mt-1 text-sm ${
                  nameValidation.isValid ? 'text-green-600' : 'text-red-500'
                }`}>
                  {nameValidation.isValid ? (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-500" />
                  )}
                  {nameValidation.message}
                </div>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Use lowercase letters, numbers, and underscores only. This will be used to call your agent with @agent_name.
              </p>
            </div>
            
            <div>
              <Label htmlFor="display_name">Display Name (Optional)</Label>
              <Input
                id="display_name"
                placeholder="e.g., PyTorch Deep Learning Agent"
                value={formData.display_name}
                onChange={(e) => handleInputChange('display_name', e.target.value)}
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">
                A user-friendly name for your agent.
              </p>
            </div>
          </div>
        );

      case 'description':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="description">Agent Description *</Label>
              <Textarea
                id="description"
                placeholder="Describe what your agent does and when to use it..."
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                className="mt-1 min-h-[100px]"
                maxLength={1000}
              />
              <div className="space-y-1 mt-1">
                <p className="text-xs text-gray-500">
                  This helps users understand when to use your agent.
                </p>
                <div className="flex justify-end">
                  <p className={`text-xs ${
                    formData.description.length < 10 ? 'text-red-500' : 
                    formData.description.length >= 1000 ? 'text-orange-500' : 'text-gray-500'
                  }`}>
                    {formData.description.length}/1000 (min: 10)
                  </p>
                </div>
              </div>
            </div>
          </div>
        );

      case 'prompt':
        return (
          <div className="space-y-4">
            {/* AI Instruction Generator */}
            <div className="bg-gradient-to-r from-red-50 to-orange-50 p-3 rounded-lg border border-[#FF7F7F]/30 mb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wand2 className="w-4 h-4 text-[#FF7F7F]" />
                  <h4 className="text-sm font-medium text-gray-800">AI Instruction Generator</h4>
                </div>
                {!instructionGenerator.showGenerator ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setInstructionGenerator(prev => ({ ...prev, showGenerator: true }))}
                    className="text-[#FF7F7F] border-[#FF7F7F]/50 hover:bg-[#FF7F7F]/10"
                  >
                    <Sparkles className="w-4 h-4 mr-1" />
                    Generate
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setInstructionGenerator(prev => ({ ...prev, showGenerator: false }))}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    Cancel
                  </Button>
                )}
              </div>
              {!instructionGenerator.showGenerator && (
                <p className="text-xs text-gray-600 mt-1">
                  Let AI help you create professional agent instructions
                </p>
              )}
              
              {/* Expanded Generator Form */}
              {instructionGenerator.showGenerator && (
                <div className="mt-3 space-y-3 border-t border-[#FF7F7F]/20 pt-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="category" className="text-xs">Category *</Label>
                      <Select
                        value={instructionGenerator.category}
                        onValueChange={(value) => setInstructionGenerator(prev => ({ ...prev, category: value }))}
                      >
                        <SelectTrigger className="mt-1 h-8 text-sm">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Visualization">Visualization</SelectItem>
                          <SelectItem value="Modelling">Modelling</SelectItem>
                          <SelectItem value="Data Manipulation">Data Manipulation</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-end">
                      <Button
                        type="button"
                        onClick={generateInstructions}
                        disabled={
                          !instructionGenerator.category || 
                          instructionGenerator.requirements.length < 10 || 
                          instructionGenerator.isGenerating
                        }
                        size="sm"
                        className="bg-gradient-to-r from-[#FF7F7F] to-[#FF6666] hover:from-[#FF6666] hover:to-[#E55555] text-white h-8"
                      >
                        {instructionGenerator.isGenerating ? (
                          <>
                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3 h-3 mr-1" />
                            Generate
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="requirements" className="text-xs">What should your agent do? *</Label>
                    <Textarea
                      id="requirements"
                      placeholder="e.g., Create time series plots with trend analysis, Build classification models, Clean CSV data..."
                      value={instructionGenerator.requirements}
                      onChange={(e) => setInstructionGenerator(prev => ({ ...prev, requirements: e.target.value }))}
                      className="mt-1 min-h-[60px] text-sm"
                      maxLength={2000}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {instructionGenerator.requirements.length}/2000 (min: 10)
                    </p>
                  </div>
                </div>
              )}
            </div>
            
            <div>
              <Label htmlFor="prompt_template">Agent Instructions *</Label>
              <Textarea
                id="prompt_template"
                placeholder="You are a specialized AI agent that... Your task is to... When given data, you should..."
                value={formData.prompt_template}
                onChange={(e) => handleInputChange('prompt_template', e.target.value)}
                className="mt-1 min-h-[200px]"
              />
              <div className="space-y-1 mt-1">
                <p className="text-xs text-gray-500">
                  Define the agent's behavior, expertise, and approach to analysis.
                </p>
                <div className="flex justify-end">
                  <p className={`text-xs ${
                    formData.prompt_template.length < 50 ? 'text-red-500' : 'text-gray-500'
                  }`}>
                    {formData.prompt_template.length} characters (min: 50)
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-red-50 p-3 rounded-lg border border-[#FF7F7F]/20">
              <h4 className="text-sm font-medium text-[#FF7F7F] mb-1">💡 Tips for great prompts:</h4>
              <ul className="text-xs text-gray-700 space-y-1">
                <li>• Be specific about the agent's expertise area</li>
                <li>• Define the type of analysis it should perform</li>
                <li>• Mention preferred methods or libraries</li>
                <li>• Specify output format expectations</li>
              </ul>
            </div>
          </div>
        );

      case 'review':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Review Your Agent</h3>
            
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{formData.display_name || formData.agent_name}</CardTitle>
                  <Badge variant="secondary">@{formData.agent_name}</Badge>
                </div>
                <CardDescription>{formData.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div>
                  <Label className="text-sm font-medium">Agent Instructions:</Label>
                  <div className="mt-1 p-3 bg-gray-50 rounded text-sm max-h-32 overflow-y-auto">
                    {formData.prompt_template}
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <div className="bg-yellow-50 p-3 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> Once created, the agent name cannot be changed. You can modify the description and instructions later.
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case 'name': return 'Agent Identity';
      case 'description': return 'Agent Description';
      case 'prompt': return 'Agent Instructions';
      case 'review': return 'Review & Create';
      default: return '';
    }
  };

  const steps: AgentFormStep[] = ['name', 'description', 'prompt', 'review'];
  const currentStepIndex = steps.indexOf(currentStep);

  return (
    <div className="p-4 h-full flex flex-col max-w-full">
      {/* Progress indicator */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold">{getStepTitle()}</h3>
          <span className="text-sm text-gray-500">
            {currentStepIndex + 1} of {steps.length}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-[#FF7F7F] h-2 rounded-full transition-all duration-300"
            style={{ width: `${((currentStepIndex + 1) / steps.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Step content */}
      <div className="flex-1 overflow-y-auto px-1">
        {renderStepContent()}
      </div>

      {/* Navigation buttons */}
      <div className="flex justify-between pt-4 border-t mt-4">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={currentStep === 'name'}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Previous
        </Button>
        
        {currentStep === 'review' ? (
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="bg-gradient-to-r from-[#FF7F7F] to-[#FF6666] hover:from-[#FF6666] hover:to-[#E55555] text-white"
          >
            {isSubmitting ? (
              <>Creating...</>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Create Agent
              </>
            )}
          </Button>
        ) : (
          <Button
            onClick={handleNext}
            disabled={!canProceedFromStep(currentStep)}
            className="bg-gradient-to-r from-[#FF7F7F] to-[#FF6666] hover:from-[#FF6666] hover:to-[#E55555] text-white"
          >
            Next
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        )}
      </div>
    </div>
  );
} 