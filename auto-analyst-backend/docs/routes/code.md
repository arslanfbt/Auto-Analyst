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
    "code": "string"  // Python code to execute
}
```

**Response:**
```json
{
    "output": "string",  // Execution output
    "plotly_outputs": [  // Optional array of plotly outputs
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
    "original_code": "string",  // Code to be edited
    "user_prompt": "string"     // Instructions for editing
}
```

**Response:**
```json
{
    "edited_code": "string"  // The edited code
}
```

**Error Responses:**
- `400 Bad Request`: Missing original code or editing instructions
- `500 Internal Server Error`: Editing error

### Fix Code
Uses AI to fix code with errors, employing a block-by-block approach.

**Endpoint:** `POST /code/fix`

**Request Body:**
```json
{
    "code": "string",    // Code containing errors
    "error": "string"    // Error message to fix
}
```

**Response:**
```json
{
    "fixed_code": "string"  // The fixed code
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
    "code": "string"  // Code to clean
}
```

**Response:**
```json
{
    "cleaned_code": "string"  // The cleaned code
}
```

**Error Responses:**
- `400 Bad Request`: No code provided
- `500 Internal Server Error`: Cleaning error

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

### Error Handling
When fixing code, the system:
- Identifies specific code blocks with errors
- Processes error messages to extract relevant information
- Fixes each block individually while maintaining the overall structure
- Preserves code block markers and relationships

### Dataset Context
When editing or fixing code, the system provides context about the current dataset including:
- Number of rows and columns
- Column names and data types
- Null value counts
- Sample values for each column

## Session Management
All endpoints require a valid session ID, which is used to:
- Access the current dataset
- Maintain state between requests
- Track code execution history

## Error Handling
The system provides detailed error messages while maintaining security by:
- Logging errors for debugging
- Returning user-friendly error messages
- Preserving original code in case of processing failures
