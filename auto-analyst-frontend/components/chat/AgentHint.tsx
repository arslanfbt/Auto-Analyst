import React from 'react'

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
]

const AgentHint: React.FC = () => {
  return (
    <div className="text-sm text-gray-500 p-2">
      <p>Available agents (use @ to select):</p>
      <ul className="list-disc pl-5 mt-1">
        {agents.map(agent => (
          <li key={agent.name}>
            <code>@{agent.name}</code> - {agent.description}
          </li>
        ))}
      </ul>
    </div>
  )
}

export default AgentHint 