"use client"

import React, { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import { X } from "lucide-react"
import { Button } from "../ui/button"

interface OnboardingTooltipProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OnboardingTooltip: React.FC<OnboardingTooltipProps> = ({ 
  isOpen, 
  onClose 
}) => {
  const [step, setStep] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  const tooltipSteps = [
    {
      title: "Getting Started",
      content: (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Upload Your Data</h3>
          <p>Press the <span className="text-red-400 font-medium">attach</span> button to upload data.</p>
          <div className="border rounded p-2 flex items-center gap-2 bg-gray-50">
            <span className="text-gray-700">Type your message here...</span>
            <div className="w-8 h-8 rounded-full bg-red-400 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
              </svg>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "Describe Your Data",
      content: (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Add Description</h3>
          <p>Add a few lines to describe the data and press <span className="text-red-400 font-medium">Auto-generate</span>.</p>
          <div className="border rounded p-2 space-y-2 bg-gray-50">
            <p className="text-sm text-gray-700">Dataset Details</p>
            <div className="flex items-center justify-between">
              <span className="text-sm">Description</span>
              <span className="bg-red-400 text-white px-2 py-0.5 rounded text-xs">Auto-generate</span>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "Work with Agents",
      content: (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Specify Which Agent to Use</h3>
          <p>Use <span className="text-red-400 font-medium">@agent_name</span> to specify which agent to use.</p>
          <div className="border rounded p-2 space-y-2 bg-gray-50">
            <p className="text-sm text-gray-700">data_viz_agent</p>
            <div className="border rounded p-1 flex items-center justify-between">
              <span className="text-sm text-gray-700">Visualize the relationship between age and salary</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
              </svg>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "Use the Planner",
      content: (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Let the Planner Work for You</h3>
          <p>Or just specify what you want the agents to do, so the <span className="text-red-400 font-medium">planner</span> chooses for you.</p>
          <div className="border rounded p-2 space-y-2 bg-gray-50">
            <div className="border rounded p-1 flex items-center justify-between">
              <span className="text-sm text-gray-700">Visualize the relationship between age and salary</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
              </svg>
            </div>
          </div>
        </div>
      )
    },
  ];

  const nextStep = () => {
    if (step < tooltipSteps.length - 1) {
      setStep(step + 1);
    } else {
      onClose();
      localStorage.setItem('hasSeenOnboarding', 'true');
    }
  };

  if (!mounted || !isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Blurred background overlay */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Tooltip content */}
      <div className="relative bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4 z-10">
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
        >
          <X size={20} />
        </button>
        
        <div className="mb-2 flex items-center space-x-2">
          <span className="text-xl font-bold text-gray-800">{tooltipSteps[step].title}</span>
        </div>

        <div className="my-4">
          {tooltipSteps[step].content}
        </div>
        
        {/* Step indicators */}
        <div className="flex justify-between items-center mt-6">
          <div className="flex space-x-2">
            {tooltipSteps.map((_, index) => (
              <div 
                key={index}
                className={`w-2 h-2 rounded-full ${
                  index === step ? 'bg-red-400' : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
          
          <Button 
            onClick={nextStep}
            className="bg-red-400 hover:bg-red-500 text-white"
          >
            {step < tooltipSteps.length - 1 ? 'Next' : 'Got it!'}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export const useOnboardingTooltip = () => {
  const [showTooltip, setShowTooltip] = useState(false);
  
  useEffect(() => {
    // Check if this is the user's first time
    const hasSeenOnboarding = localStorage.getItem('hasSeenOnboarding');
    
    if (!hasSeenOnboarding) {
      // Wait a moment after page load to show the tooltip
      const timer = setTimeout(() => {
        setShowTooltip(true);
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, []);
  
  return {
    showTooltip,
    setShowTooltip
  };
}; 