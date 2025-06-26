# Code Routes Documentation

This document describes the API endpoints available for code execution, editing, fixing, and cleaning operations in the Auto-Analyst backend.

## Base URL

All code-related endpoints are prefixed with `/code`.

## Endpoints

### Execute Code
Executes Python code against the current session's dataframe.

**Endpoint:** `POST /code/execute`

**Request Body:**
```json
{
    "code": "string",              // Python code to execute
    "session_id": "string",        // Optional session ID
    "message_id": 123              // Optional message ID for tracking
}
```

**Response:**
```json
{
    "output": "string",            // Execution output
    "plotly_outputs": [            // Optional array of plotly outputs
        "string"
    ]
}
```

**Error Responses:**
- `400 Bad Request`: No dataset loaded or no code provided
- `500 Internal Server Error`: Execution error

### Edit Code
Uses AI to edit code based on user instructions.

**Endpoint:** `POST /code/edit`

**Request Body:**
```json
{
    "original_code": "string",     // Code to be edited
    "user_prompt": "string"        // Instructions for editing
}
```

**Response:**
```json
{
    "edited_code": "string"        // The edited code
}
```

**Error Responses:**
- `400 Bad Request`: Missing original code or editing instructions
- `500 Internal Server Error`: Editing error

### Fix Code
Uses AI to fix code with errors, employing a block-by-block approach with DSPy refinement.

**Endpoint:** `POST /code/fix`

**Request Body:**
```json
{
    "code": "string",              // Code containing errors
    "error": "string"              // Error message to fix
}
```

**Response:**
```json
{
    "fixed_code": "string"         // The fixed code
}
```

**Error Responses:**
- `400 Bad Request`: Missing code or error message
- `500 Internal Server Error`: Fixing error

### Clean Code
Cleans and formats code by organizing imports and ensuring proper code block formatting.

**Endpoint:** `POST /code/clean-code`

**Request Body:**
```json
{
    "code": "string"               // Code to clean
}
```

**Response:**
```json
{
    "cleaned_code": "string"       // The cleaned code
}
```

**Error Responses:**
- `400 Bad Request`: No code provided
- `500 Internal Server Error`: Cleaning error

### Get Latest Code
Retrieves the latest code from a specific message.

**Endpoint:** `POST /code/get-latest-code`

**Request Body:**
```json
{
    "message_id": 123              // Message ID to retrieve code from
}
```

**Response:**
```json
{
    "code": "string"               // The retrieved code
}
```

**Error Responses:**
- `400 Bad Request`: Missing message ID
- `404 Not Found`: Message not found
- `500 Internal Server Error`: Retrieval error

## Code Processing Features

### Import Organization
The code processing system automatically:
- Moves all import statements to the top of the file
- Deduplicates imports
- Sorts imports alphabetically

### Code Block Management
The system supports code blocks marked with special comments:
- Start marker: `# agent_name code start`
- End marker: `# agent_name code end`

### Error Handling with DSPy Refinement
When fixing code, the system uses DSPy's refinement mechanism:
- Identifies specific code blocks with errors
- Processes error messages to extract relevant information
- Uses a scoring function to validate fixes
- Employs iterative refinement with up to 3 attempts
- Fixes each block individually while maintaining the overall structure
- Preserves code block markers and relationships

### Dataset Context
When editing or fixing code, the system provides context about the current dataset including:
- Number of rows and columns
- Column names and data types
- Null value counts
- Sample values for each column

### Code Execution Safety
The execution system includes safety measures:
- Removes blocking calls like `plt.show()`
- Handles `__main__` block extraction
- Cleans up print statements with unwanted newlines
- Executes code in isolated namespaces

## Session Management
All endpoints require a valid session ID, which is used to:
- Access the current dataset
- Maintain state between requests
- Track code execution history
- Store execution results for analysis

## Error Handling
The system provides detailed error messages while maintaining security by:
- Logging errors for debugging
- Returning user-friendly error messages
- Preserving original code in case of processing failures
- Using code scoring to validate fixes before returning results
