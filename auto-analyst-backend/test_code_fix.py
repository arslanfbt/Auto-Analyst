import sys
import os
from src.routes.code_routes import fix_code_with_dspy, extract_code_blocks
from scripts.format_response import execute_code_from_markdown
import pandas as pd
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, 
                   format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def read_code_file(file_path):
    """Read the code file content"""
    with open(file_path, 'r') as f:
        return f.read()

def demo_code_fixing():
    """Demonstrate the code fixing functionality using sample code with errors"""
    
    print("\n===== CODE ERROR FIXING DEMONSTRATION =====\n")
    
    # Sample dataset
    sample_data = {
        'price': [10000, 12000, 13000, 15000, 18000],
        'area': [1000, 1200, 1300, 1500, 1800],
        'bedrooms': [2, 3, 3, 4, 4],
        'bathrooms': [1, 1, 2, 2, 3],
        'stories': [1, 1, 2, 2, 3],
        'mainroad': ['yes', 'yes', 'no', 'yes', 'yes'],
        'guestroom': ['no', 'no', 'yes', 'no', 'yes'],
        'basement': ['no', 'no', 'yes', 'no', 'yes'],
        'hotwaterheating': ['no', 'yes', 'no', 'yes', 'yes'],
        'airconditioning': ['yes', 'yes', 'no', 'yes', 'yes'],
        'parking': [1, 1, 2, 2, 3],
        'prefarea': ['yes', 'no', 'yes', 'no', 'yes'],
        'furnishingstatus': ['furnished', 'semi-furnished', 'unfurnished', 'furnished', 'semi-furnished']
    }
    
    df = pd.DataFrame(sample_data)
    
    # 1. Load the sample code with errors
    sample_code_path = "sample_code.py"
    original_code = read_code_file(sample_code_path)
    
    # Introduce an error in the statistical analytics agent
    # Change numpy import from np to pd (conflict with pandas)
    modified_code = original_code.replace("import numpy as np", "import numpy as pd")
    
    print("Original code has been modified to introduce an error (numpy import conflict)")
    
    # 2. Execute the code to get the error
    print("\n=== EXECUTING CODE WITH ERROR... ===\n")
    output, _ = execute_code_from_markdown(modified_code, df)
    print(output)
    
    # 3. Fix the code using our error fixing function
    print("\n=== FIXING THE CODE... ===\n")
    dataset_context = f"DataFrame with {len(df)} rows and columns: {', '.join(df.columns)}"
    fixed_code = fix_code_with_dspy(modified_code, output, dataset_context)
    
    # 4. Execute the fixed code to verify it works
    print("\n=== EXECUTING FIXED CODE... ===\n")
    fixed_output, _ = execute_code_from_markdown(fixed_code, df)
    print(fixed_output)
    
    # 5. Show what changes were made
    print("\n=== ANALYZING FIXES MADE ===\n")
    original_blocks = extract_code_blocks(modified_code)
    fixed_blocks = extract_code_blocks(fixed_code)
    
    for block_name in original_blocks:
        if block_name in fixed_blocks:
            print(f"Block: {block_name}")
            # Very simple diff - just check if they're different
            if original_blocks[block_name] != fixed_blocks[block_name]:
                print(f"  - This block was modified during fixing")
            else:
                print(f"  - No changes to this block")
    
    print("\n===== DEMONSTRATION COMPLETE =====")

if __name__ == "__main__":
    demo_code_fixing() 