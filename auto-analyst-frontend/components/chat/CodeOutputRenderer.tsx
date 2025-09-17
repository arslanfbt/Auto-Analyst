"use client"

import React from "react"
import { AlertTriangle, Pin, PinOff, Maximize2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import PlotlyChart from "@/components/chat/PlotlyChart"
import MatplotlibChart from "@/components/chat/MatplotlibChart"
import CodeFixButton from "@/components/chat/CodeFixButton"

interface CodeOutput {
  type: 'error' | 'output' | 'plotly' | 'matplotlib';
  content: any;
  messageIndex: number;
  codeId: string;
  vizIndex?: number;
}

interface CodeEntry {
  id: string;
  language: string;
  code: string;
  timestamp: number;
  title?: string;
  isExecuting?: boolean;
  output?: string;
  hasError?: boolean;
  messageIndex: number;
}

interface CodeOutputRendererProps {
  messageIndex: number;
  outputs: CodeOutput[];
  codeEntries: CodeEntry[];
  processTableMarkersInErrorOutput: (content: string) => React.ReactNode;
  processTableMarkersInOutput: (content: string) => React.ReactNode;
  isVisualizationPinned: (content: any, code: string, idx: number) => boolean;
  togglePinVisualization: (content: any, code: string, type: string, idx: number) => void; // Fixed type signature
  setFullscreenViz: (viz: { type: string; content: any }) => void;
  codeFixState: {
    isFixing: boolean;
    codeBeingFixed: string | null;
  };
  codeFixes: Record<string, number>;
  sessionId: string;
  storeSessionId: string;
  handleFixStart: (codeId: string) => void;
  handleFixComplete: (codeId: string, fixedCode: string) => void;
  handleCreditCheck: (codeId: string, hasEnough: boolean) => void; // Fixed signature
}

const CodeOutputRenderer: React.FC<CodeOutputRendererProps> = ({
  messageIndex,
  outputs,
  codeEntries,
  processTableMarkersInErrorOutput,
  processTableMarkersInOutput,
  isVisualizationPinned,
  togglePinVisualization,
  setFullscreenViz,
  codeFixState,
  codeFixes,
  sessionId,
  storeSessionId,
  handleFixStart,
  handleFixComplete,
  handleCreditCheck,
}) => {
  if (outputs.length === 0) return null;

  // Group outputs by type for organized display
  const errorOutputs = outputs.filter(output => output.type === 'error');
  const textOutputs = outputs.filter(output => output.type === 'output');
  const plotlyOutputs = outputs.filter(output => output.type === 'plotly');
  const matplotlibOutputs = outputs.filter(output => output.type === 'matplotlib');

  console.log('🔍 Output types for message', messageIndex, ':', {
    errors: errorOutputs.length,
    text: textOutputs.length,
    plotly: plotlyOutputs.length,
    matplotlib: matplotlibOutputs.length
  });

  return (
    <div className="mt-2 space-y-4">
      {/* Show ALL error outputs */}
      {errorOutputs.map((errorOutput, errorIdx) => (
        <div key={`error-${messageIndex}-${errorIdx}`} className="bg-red-50 border border-red-200 rounded-md p-3 overflow-auto relative">
          <div className="flex items-center text-red-600 font-medium mb-2">
            <AlertTriangle size={16} className="mr-2" />
            Error Output {errorOutputs.length > 1 ? `(${errorIdx + 1})` : ''}
          </div>
          
          {/* DEBUG: Always show CodeFixButton for testing */}
          <div className="mb-2 p-2 bg-yellow-100 border border-yellow-300 rounded">
            <div className="text-xs text-yellow-800 mb-1">DEBUG INFO:</div>
            <div className="text-xs text-yellow-800">codeId: {errorOutput.codeId || 'MISSING'}</div>
            <div className="text-xs text-yellow-800">hasCode: {codeEntries.find(entry => entry.id === errorOutput.codeId)?.code ? 'YES' : 'NO'}</div>
            <div className="text-xs text-yellow-800">errorContent: {errorOutput.content ? 'YES' : 'NO'}</div>
          </div>
          
          {/* Always render CodeFixButton for debugging */}
          <CodeFixButton
            codeId={errorOutput.codeId || 'debug-code-id'}
            errorOutput={errorOutput.content as string || 'Debug error message'}
            code={codeEntries.find(entry => entry.id === errorOutput.codeId)?.code || 'print("debug code")'}
            isFixing={codeFixState.isFixing && codeFixState.codeBeingFixed === errorOutput.codeId}
            codeFixes={codeFixes}
            sessionId={sessionId || storeSessionId || ''}
            onFixStart={handleFixStart}
            onFixComplete={handleFixComplete}
            onCreditCheck={handleCreditCheck}
            variant="inline"
          />
          
          {processTableMarkersInErrorOutput(errorOutput.content as string)}
        </div>
      ))}
      
      {/* Show ALL text outputs */}
      {textOutputs.map((textOutput, textIdx) => (
        <div key={`text-${messageIndex}-${textIdx}`} className="bg-gray-50 border border-gray-200 rounded-md p-3 relative">
          <div className="flex items-center text-gray-700 font-medium mb-2">
            Output {textOutputs.length > 1 ? `(${textIdx + 1})` : ''}
          </div>
          
          {processTableMarkersInOutput(textOutput.content as string)}
        </div>
      ))}
      
      {/* Show ALL plotly visualizations */}
      {plotlyOutputs.map((output, idx) => {
        const codeEntry = codeEntries.find(entry => entry.id === output.codeId);
        const currentCode = codeEntry?.code || '';
        const isPinned = isVisualizationPinned(output.content, currentCode, idx);
        
        return (
          <div key={`plotly-${messageIndex}-${idx}`} className="bg-white border border-gray-200 rounded-md p-3 overflow-auto relative">
            <div className="flex items-center justify-between text-gray-700 font-medium mb-2">
              <span>📊 Interactive Visualization {plotlyOutputs.length > 1 ? `(${idx + 1})` : ''}</span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFullscreenViz({ type: 'plotly', content: output.content })}
                  className="flex items-center gap-1 h-7 px-2 text-xs text-gray-600 border-gray-300 hover:bg-gray-100"
                >
                  <Maximize2 className="h-3 w-3" />
                  <span className="hidden sm:inline">Fullscreen</span>
                </Button>
                <Button
                  variant={isPinned ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    const currentCode = codeEntries.find(entry => entry.id === output.codeId)?.code || '';
                    if (currentCode) {
                      togglePinVisualization(output.content, currentCode, 'plotly', idx);
                    } else {
                      const codeToUse = `plotly_${output.codeId}_${idx}`;
                      togglePinVisualization(output.content, codeToUse, 'plotly', idx);
                    }
                  }}
                  className={`flex items-center gap-1 h-7 px-2 text-xs ${
                    isPinned 
                      ? 'bg-[#FF7F7F] hover:bg-[#FF6666] text-white' 
                      : 'text-[#FF7F7F] border-[#FF7F7F] hover:bg-[#FF7F7F] hover:text-white'
                  }`}
                >
                  {isPinned ? <PinOff className="h-3 w-3" /> : <Pin className="h-3 w-3" />}
                  <span className="hidden sm:inline">
                    {isPinned ? 'Unpin' : 'Pin'}
                  </span>
                </Button>
              </div>
            </div>
            
            <div className="w-full">
              <PlotlyChart data={output.content.data} layout={output.content.layout} />
            </div>
          </div>
        );
      })}
      
      {/* Show ALL matplotlib visualizations */}
      {matplotlibOutputs.map((output, idx) => {
        const codeEntry = codeEntries.find(entry => entry.id === output.codeId);
        const currentCode = codeEntry?.code || '';
        const isPinned = isVisualizationPinned(output.content, currentCode, idx);
        
        return (
          <div key={`matplotlib-${messageIndex}-${idx}`} className="bg-white border border-gray-200 rounded-md p-3 overflow-auto relative">
            <div className="flex items-center justify-between text-gray-700 font-medium mb-2">
              <span>📈 Chart Visualization {matplotlibOutputs.length > 1 ? `(${idx + 1})` : ''}</span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFullscreenViz({ type: 'matplotlib', content: output.content })}
                  className="flex items-center gap-1 h-7 px-2 text-xs text-gray-600 border-gray-300 hover:bg-gray-100"
                >
                  <Maximize2 className="h-3 w-3" />
                  <span className="hidden sm:inline">Fullscreen</span>
                </Button>
                <Button
                  variant={isPinned ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    const currentCode = codeEntries.find(entry => entry.id === output.codeId)?.code || '';
                    if (currentCode) {
                      togglePinVisualization(output.content, currentCode, 'matplotlib', idx);
                    } else {
                      const codeToUse = `matplotlib_${output.codeId}_${idx}`;
                      togglePinVisualization(output.content, codeToUse, 'matplotlib', idx);
                    }
                  }}
                  className={`flex items-center gap-1 h-7 px-2 text-xs ${
                    isPinned 
                      ? 'bg-[#FF7F7F] hover:bg-[#FF6666] text-white' 
                      : 'text-[#FF7F7F] border-[#FF7F7F] hover:bg-[#FF7F7F] hover:text-white'
                  }`}
                >
                  {isPinned ? <PinOff className="h-3 w-3" /> : <Pin className="h-3 w-3" />}
                  <span className="hidden sm:inline">
                    {isPinned ? 'Unpin' : 'Pin'}
                  </span>
                </Button>
              </div>
            </div>
            
            <div className="w-full">
              <MatplotlibChart imageData={output.content} />
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default CodeOutputRenderer;
