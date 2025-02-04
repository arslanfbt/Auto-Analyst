import React from 'react';

const agents = [
  {
    name: 'data_viz_agent',
    description: 'Specializes in data visualization'
  },
  {
    name: 'data_analysis_agent',
    description: 'Performs statistical analysis'
  },
  {
    name: 'code_combiner_agent',
    description: 'Combines and optimizes code'
  }
];

const AgentHint: React.FC = () => {
  return (
    <div className="bg-gray-50 rounded-lg p-4 shadow-sm border border-gray-200 max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-100">
      <p className="text-sm font-medium text-gray-700 mb-2">Available agents (use <code className="bg-gray-100 px-1 py-0.5 rounded">@</code> to select):</p>
      <ul className="space-y-2">
        {agents.map(agent => (
          <li key={agent.name} className="flex items-start">
            <span className="inline-flex items-center justify-center bg-blue-100 text-blue-800 text-sm font-mono px-2 py-1 rounded-full mr-2">
              @{agent.name}
            </span>
            <span className="text-sm text-gray-600">{agent.description}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default AgentHint;