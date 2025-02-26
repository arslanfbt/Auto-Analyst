# API Endpoints Documentation

## Overview
This document provides an overview of the API endpoints available in the AI Analytics API. Each endpoint is described with its purpose, request parameters, and expected responses.

---

## 1. Upload DataFrame

### Endpoint
`POST /upload_dataframe`

### Description
Uploads a CSV file as a DataFrame and associates it with a session.

### Request Parameters
- **file**: The CSV file to upload (required).
- **name**: The name of the dataset (required).
- **description**: A description of the dataset (required).
- **session_id**: The session ID (automatically generated if not provided).

### Response
- **200 OK**: Returns a success message and the session ID.
- **400 Bad Request**: If there is an error in processing the file.

---

## 2. Chat with Agent

### Endpoint
`POST /chat/{agent_name}`

### Description
Sends a query to a specified agent and retrieves the response.

### Request Parameters
- **agent_name**: The name of the agent to handle the query (required).
- **query**: The query to be processed by the agent (required).
- **session_id**: The session ID (automatically generated if not provided).

### Response
- **200 OK**: Returns the agent's response, including the formatted output.
- **400 Bad Request**: If no dataset is loaded or if the agent is not found.
- **500 Internal Server Error**: If there is an error during agent execution.

---

## 3. Chat with All Agents

### Endpoint
`POST /chat`

### Description
Sends a query to all available agents and retrieves their responses.

### Request Parameters
- **query**: The query to be processed (required).
- **session_id**: The session ID (automatically generated if not provided).

### Response
- **200 OK**: Returns a stream of responses from all agents.
- **400 Bad Request**: If no dataset is loaded.
- **500 Internal Server Error**: If the AI system is not properly initialized.

---

## 4. Execute Code

### Endpoint
`POST /execute_code`

### Description
Executes a block of code provided in the request.

### Request Parameters
- **code**: The code to be executed (required).
- **session_id**: The session ID (automatically generated if not provided).

### Response
- **200 OK**: Returns the output of the executed code and any Plotly outputs.
- **400 Bad Request**: If no code is provided or if no dataset is loaded.
- **500 Internal Server Error**: If there is an error during code execution.

---

## 5. Get Model Settings

### Endpoint
`GET /api/model-settings`

### Description
Retrieves the current model settings.

### Response
- **200 OK**: Returns the current model settings, including provider, model, and configuration details.

---

## 6. Update Model Settings

### Endpoint
`POST /settings/model`

### Description
Updates the model settings with the provided parameters.

### Request Body
- **provider**: The model provider (required).
- **model**: The model name (required).
- **api_key**: The API key for the model (optional).
- **temperature**: The temperature setting for the model (optional).
- **max_tokens**: The maximum tokens for the model (optional).

### Response
- **200 OK**: Returns a success message if the model settings are updated.
- **400 Bad Request**: If the model selection is invalid.
- **401 Unauthorized**: If the API key is invalid.
- **500 Internal Server Error**: If there is an error configuring the model.

---

## 7. Get Default Dataset

### Endpoint
`GET /api/default-dataset`

### Description
Retrieves the default dataset and ensures the session is using it.

### Request Parameters
- **session_id**: The session ID (automatically generated if not provided).

### Response
- **200 OK**: Returns the headers and first 10 rows of the default dataset.
- **400 Bad Request**: If there is an error retrieving the dataset.

---

## 8. Reset Session

### Endpoint
`POST /reset-session`

### Description
Resets the session to use the default dataset with optional new description.

### Request Parameters
- **session_id**: The session ID (automatically generated if not provided).
- **name**: The new name for the dataset (optional).
- **description**: The new description for the dataset (optional).

### Response
- **200 OK**: Returns a success message indicating the session has been reset.
- **500 Internal Server Error**: If there is an error resetting the session.

---

## 9. Health Check

### Endpoint
`GET /health`

### Description
Checks the health status of the API.

### Response
- **200 OK**: Returns a message indicating the API is healthy and running.

---

## Conclusion
This documentation provides a comprehensive overview of the API endpoints available in the AI Analytics API. Each endpoint is designed to facilitate various functionalities related to data analysis and interaction with AI agents.