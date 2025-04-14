
def parse_agents(agent_string):
    """
    Parse a string containing agent names separated by ->, (, ), or commas
    and return a list of agent names.
    """
    if not agent_string or not agent_string.strip():
        return []
    
    # Replace parentheses with spaces to handle cases with parentheses
    import re
    cleaned_string = re.sub(r'\(.*?\)', '', agent_string)
    
    # Split by -> to get individual agent segments
    agent_segments = cleaned_string.split('->')
    
    # Process each segment to extract agent names
    agents = []
    for segment in agent_segments:
        # Split by comma and strip whitespace
        segment_agents = [agent.strip() for agent in segment.split(',') if agent.strip()]
        agents.extend(segment_agents)
    
    return agents

sample = "preprocessing_agent -> statistical_analytics_agent"
agents = parse_agents(sample)
print(agents)

# Test with different formats
test_samples = [
    "preprocessing_agent -> data_viz_agent",
    "preprocessing_agent(dataset, goal)",
    "preprocessing_agent -> statistical_analytics_agent, data_viz_agent",
    "preprocessing_agent, statistical_analytics_agent -> data_viz_agent",
    "",
    "preprocessing_agent(dataset, goal) -> data_viz_agent(dataset)"
]

for test in test_samples:
    print(f"Input: {test}")
    print(f"Output: {parse_agents(test)}")