"use client"

import React, { useCallback, useState } from "react"
import { useVisualizationsStore } from '@/lib/store/visualizationsStore'

interface VisualizationManagerProps {
  codeEntries: any[];
}

export const useVisualizationManager = ({ codeEntries }: VisualizationManagerProps) => {
  const { 
    visualizations,
    addOrUpdatePlotly,
    addOrUpdateMatplotlib,
    unpinVisualization,
    clear 
  } = useVisualizationsStore();

  const [fullscreenViz, setFullscreenViz] = useState<{ type: string; content: any } | null>(null);

  // Simple hash function for code content (same as in original ChatWindow)
  const hashCode = useCallback((str: string): string => {
    let hash = 0;
    if (str.length === 0) return '0';
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(); // Add Math.abs() to match store
  }, []);

  // Helper function to check if a visualization is pinned
  const isVisualizationPinned = useCallback((content: any, code: string, vizIndex?: number): boolean => {
    try {
      // Use the same hash logic as togglePinVisualization
      const hashInput = code + (vizIndex !== undefined ? `_viz_${vizIndex}` : '');
      const codeHash = hashInput ? hashCode(hashInput) : '';
      return visualizations.some(viz => viz.codeHash === codeHash);
    } catch (error) {
      console.warn('Error checking pin status:', error);
      return false;
    }
  }, [visualizations, hashCode]);

  // Helper function to toggle pin status
  const togglePinVisualization = useCallback((content: any, code: string, type: 'plotly' | 'matplotlib', vizIndex?: number) => {
    try {
      // Include visualization index in hash to make multiple viz from same code unique
      const hashInput = code + (vizIndex !== undefined ? `_viz_${vizIndex}` : '');
      const codeHash = hashInput ? hashCode(hashInput) : '';
      const existingViz = visualizations.find(viz => viz.codeHash === codeHash);

      if (existingViz) {
        // If visualization exists, unpin it
        unpinVisualization(codeHash);
      } else {
        // If visualization doesn't exist, pin it
        if (type === 'plotly' && content.data) {
          addOrUpdatePlotly(content.data, content.layout, `Plotly Visualization`, codeHash);
        } else if (type === 'matplotlib' && content) {
          addOrUpdateMatplotlib(content, `Matplotlib Chart`, codeHash);
        }
      }
    } catch (error) {
      console.warn('Error toggling pin status:', error);
    }
  }, [visualizations, hashCode, addOrUpdatePlotly, addOrUpdateMatplotlib, unpinVisualization]);

  return {
    isVisualizationPinned,
    togglePinVisualization,
    setFullscreenViz,
    fullscreenViz,
    visualizations,
    clear
  };
};
