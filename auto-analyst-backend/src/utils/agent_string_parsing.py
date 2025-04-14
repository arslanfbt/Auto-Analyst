import re

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
    
    return agents[0] if isinstance(agents, list) else agents

# sample = """preprocessing_agent(dataset, goal -> code, summary
#     instructions='Given a user-defined analysis goal and a pre-loaded dataset df, \nI will generate Python code using NumPy and Pandas to build an exploratory analytics pipeline.\nThe goal is to simplify the preprocessing and introductory analysis of the dataset.\n\nIMPORTANT: You may be provided with previous interaction history. The section marked "##"""
    
# print(parse_agents(sample))