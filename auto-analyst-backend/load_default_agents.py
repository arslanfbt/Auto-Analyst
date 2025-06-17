#!/usr/bin/env python3
"""
Script to load default agents into the AgentTemplate table.
Run this script to populate the database with the default agents.
"""

import sys
import os
from pathlib import Path

# Add the src directory to the path
src_path = Path(__file__).parent / "src"
sys.path.append(str(src_path))

def main():
    try:
        from src.db.init_default_agents import initialize_default_agents
        
        # Initialize default agents with force update enabled
        success = initialize_default_agents(force_update=True)
        
        if success:
            print("✅ Successfully loaded default agents into the database!")
            print("The following agents are now available:")
            print("  • Data Preprocessing Agent (preprocessing_agent)")
            print("  • Statistical Analytics Agent (statistical_analytics_agent)")
            print("  • Machine Learning Agent (sk_learn_agent)")
            print("  • Data Visualization Agent (data_viz_agent)")
        else:
            print("❌ Failed to load default agents")
            sys.exit(1)
            
    except ImportError as e:
        print(f"❌ Import error: {e}")
        print("Make sure you're running this script from the auto-analyst-backend directory")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main() 