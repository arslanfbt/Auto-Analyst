"use client"

import React, { useCallback } from "react"
import { useVisualizationsStore } from '@/lib/store/visualizationsStore'

interface VisualizationManagerProps {
  codeEntries: any[];
}

export const useVisualizationManager = ({ codeEntries }: VisualizationManagerProps) => {
  const { 
    isVisualizationPinned: storeIsVisualizationPinned,
    togglePinVisualization: storeTogglePinVisualization,
    setFullscreenViz,
    fullscreenViz 
  } = useVisualizationsStore();

  // Check if a visualization is pinned
  const isVisualizationPinned = useCallback((content: any, code: string, idx: number) => {
    return storeIsVisualizationPinned(content, code, idx);
  }, [storeIsVisualizationPinned]);

  // Toggle pin status of a visualization
  const togglePinVisualization = useCallback((content: any, code: string, type: string, idx: number) => {
    storeTogglePinVisualization(content, code, type, idx);
  }, [storeTogglePinVisualization]);

  return {
    isVisualizationPinned,
    togglePinVisualization,
    setFullscreenViz,
    fullscreenViz
  };
};
