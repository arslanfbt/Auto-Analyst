import sys
from pathlib import Path
sys.path.append(str(Path(__file__).resolve().parent.parent))

from src.managers.ai_manager import AI_Manager

ai_manager = AI_Manager()

input_prompt = "What are the key insights from this data? "

output = """
## Analytical Planner

### Reasoning
To extract key insights from the housing dataset, it is essential to first preprocess the data to ensure its quality and suitability for analysis. Following preprocessing, performing statistical analysis will help identify significant patterns and relationships within the data. Finally, visualizing the results will provide a clear and interpretable representation of the insights derived.


## Preprocessing Agent

### Reasoning
To derive key insights from the Housing Dataset, it is essential to start with data preprocessing and introductory analysis. This involves categorizing the data into numeric and categorical features, handling missing values appropriately, and preparing the data for further exploration. By organizing the data effectively and understanding the relationships between different variables, we can uncover meaningful patterns and trends that inform our analysis objectives.

### Code Implementation
```python
import numpy as np
import pandas as pd

# Define a safe datetime conversion function
def safe_to_datetime(date):
    try:
        return pd.to_datetime(date, errors='coerce', cache=False)
    except (ValueError, TypeError):
        return pd.NaT

# Create copies of the original dataframe
df_copy = df.copy()

# Identify categorical and numeric columns
categorical_columns = df_copy.select_dtypes(include=['object', 'category']).columns.tolist()
numeric_columns = df_copy.select_dtypes(include=[np.number]).columns.tolist()

# Handle missing values
# For numeric columns, fill missing values with the median
df_copy[numeric_columns] = df_copy[numeric_columns].fillna(df_copy[numeric_columns].median())

# For categorical columns, fill missing values with the mode
for col in categorical_columns:
    df_copy[col] = df_copy[col].fillna(df_copy[col].mode()[0])

# Convert string dates to datetime format if any date columns exist
# Example: If there's a column named 'date', uncomment the following lines
# if 'date' in df_copy.columns:
#     df_copy['date'] = df_copy['date'].apply(safe_to_datetime)

# Create a correlation matrix for numeric columns
correlation_matrix = df_copy[numeric_columns].corr()

# Display the first few rows of the processed dataframe and the correlation matrix
print(df_copy.head())
print("\nCorrelation Matrix:\n", correlation_matrix)
```

### Commentary
1. **Import Libraries**: The necessary libraries, NumPy and Pandas, are imported to handle numerical operations and data manipulation.

2. **Datetime Conversion Function**: A `safe_to_datetime` function is defined to gracefully handle the conversion of string dates to datetime objects, ensuring that any errors during conversion result in `NaT` (Not a Time) values without interrupting the workflow.

3. **Dataframe Copy**: A copy of the original dataframe `df` is created to preserve the original data during preprocessing.

4. **Identify Column Types**:
   - **Categorical Columns**: Identified using `select_dtypes` to include data types `object` and `category`.
   - **Numeric Columns**: Identified by selecting columns with numeric data types using `np.number`.

5. **Handle Missing Values**:
   - **Numeric Columns**: Missing values are filled with the median of each numeric column to maintain the central tendency without being skewed by outliers.
   - **Categorical Columns**: Missing values are filled with the mode (most frequent value) to preserve the most common category.

6. **Datetime Conversion**: Although the current dataset does not contain date columns, the preparation is made to handle such conversions if needed in the future by checking for date-specific columns and applying the `safe_to_datetime` function.

7. **Correlation Matrix**: A correlation matrix is generated for the numeric columns to identify the strength and direction of relationships between different numerical variables, which is crucial for understanding how features interact with each other.

8. **Display Outputs**: The first few rows of the processed dataframe and the correlation matrix are printed to provide an initial view of the data and its interrelationships, laying the groundwork for deeper exploratory data analysis.


## Statistical Analytics Agent

### Reasoning
To extract key insights from the Housing Dataset, we will perform a multiple linear regression analysis. This will allow us to identify which factors significantly influence housing prices. By analyzing both numerical variables (such as area, bedrooms, bathrooms) and categorical variables (like mainroad, furnishingstatus), we can determine the key drivers of price variations. Proper handling of missing values and categorical data will ensure the robustness of our analysis.

### Code Implementation
```python
import pandas as pd
import numpy as np
import statsmodels.api as sm

# Create a copy of the dataframe
df_copy = df.copy()

try:
    # Define the dependent variable
    y = df_copy['price']
    
    # Define the independent variables
    X = df_copy.drop('price', axis=1)
    
    # Check for missing values and drop rows with any missing values
    X = X.dropna()
    y = y.loc[X.index]
    
    # Convert categorical variables to 'category' dtype
    categorical_columns = X.select_dtypes(include=['object', 'category']).columns
    for col in categorical_columns:
        X[col] = X[col].astype('category')
    
    # Add a constant term to the predictors
    X = sm.add_constant(X)
    
    # Fit the OLS regression model
    model = sm.OLS(y.astype(float), X.astype(float)).fit()
    
    # Print the model summary
    print(model.summary())
    
except Exception as e:
    print(f"An error occurred: {e}")
```

### Commentary
The code performs a multiple linear regression analysis to identify the key factors affecting housing prices. It begins by creating a copy of the original dataframe to preserve the data. The dependent variable `price` is separated from the independent variables. Rows with any missing values are removed to ensure data quality. Categorical variables are converted to the 'category' data type, which allows statsmodels to handle them appropriately in the regression. A constant term is added to the independent variables to account for the intercept in the model. The Ordinary Least Squares (OLS) regression model is then fitted using the prepared data. Finally, the summary of the regression model is printed, providing detailed statistics on the significance and impact of each predictor on the housing price.


## Data Viz Agent

### Reasoning
To extract key insights from the housing dataset, it's important to analyze the relationship between house area and price, as well as understand how factors like the number of bedrooms and bathrooms influence pricing. A scatter plot of area versus price can reveal trends and correlations, while color-coding by the number of bedrooms can provide additional depth to the analysis.

### Code Implementation
```python
import plotly.express as px

# Check if the dataset has more than 50,000 rows and sample if necessary
if len(df) > 50000:
    df_sample = df.sample(n=50000)
else:
    df_sample = df.copy()

# Create a scatter plot of area vs price, colored by number of bedrooms
fig = px.scatter(df_sample, 
                 x='area', 
                 y='price', 
                 color='bedrooms', 
                 title='Housing Price vs Area Colored by Number of Bedrooms', 
                 labels={'area': 'Area (sq ft)', 'price': 'Price'},
                 hover_data=['bathrooms', 'stories'])

# Update layout for clarity and styling
fig.update_layout(
    template='plotly_white',
    xaxis_title='Area (sq ft)',
    yaxis_title='Price',
    legend_title='Bedrooms'
)

fig.to_html(full_html=False)
```

### Commentary
The scatter plot visualizes the relationship between the area of the houses and their prices. By color-coding the points based on the number of bedrooms, it becomes easier to observe how bedroom count correlates with both area and price. This helps in identifying trends such as whether larger houses with more bedrooms tend to be priced higher.
"""


input_tokens = len(ai_manager.tokenizer.encode(input_prompt))
output_tokens = len(ai_manager.tokenizer.encode(output))

print(f"Input tokens: {input_tokens}")
print(f"Output tokens: {output_tokens}")