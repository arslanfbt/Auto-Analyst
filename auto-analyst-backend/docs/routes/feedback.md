# Feedback Routes Documentation

This document describes the API endpoints available for managing user feedback on AI-generated messages in the Auto-Analyst backend.

## Base URL

All feedback-related endpoints are prefixed with `/feedback`.

## Endpoints

### Create or Update Message Feedback
Creates new feedback or updates existing feedback for a specific message.

**Endpoint:** `POST /feedback/message/{message_id}`

**Path Parameters:**
- `message_id`: ID of the message to provide feedback for

**Request Body:**
```json
{
    "rating": 5,                           // Required: Star rating (1-5)
    "model_name": "gpt-4o-mini",          // Optional: Model used for the message
    "model_provider": "openai",           // Optional: Provider of the model
    "temperature": 0.7,                   // Optional: Temperature setting
    "max_tokens": 6000                    // Optional: Max tokens setting
}
```

**Response:**
```json
{
    "feedback_id": 123,
    "message_id": 456,
    "rating": 5,
    "feedback_comment": null,
    "model_name": "gpt-4o-mini",
    "model_provider": "openai",
    "temperature": 0.7,
    "max_tokens": 6000,
    "created_at": "2023-05-01T12:00:00Z",
    "updated_at": "2023-05-01T12:00:00Z"
}
```

**Error Responses:**
- `404 Not Found`: Message with specified ID not found
- `500 Internal Server Error`: Failed to create/update feedback

### Get Message Feedback
Retrieves feedback for a specific message.

**Endpoint:** `GET /feedback/message/{message_id}`

**Path Parameters:**
- `message_id`: ID of the message to get feedback for

**Response:**
```json
{
    "feedback_id": 123,
    "message_id": 456,
    "rating": 5,
    "feedback_comment": null,
    "model_name": "gpt-4o-mini",
    "model_provider": "openai",
    "temperature": 0.7,
    "max_tokens": 6000,
    "created_at": "2023-05-01T12:00:00Z",
    "updated_at": "2023-05-01T12:00:00Z"
}
```

**Error Responses:**
- `404 Not Found`: No feedback found for the specified message
- `500 Internal Server Error`: Failed to retrieve feedback

### Get Chat Feedback
Retrieves all feedback for messages in a specific chat.

**Endpoint:** `GET /feedback/chat/{chat_id}`

**Path Parameters:**
- `chat_id`: ID of the chat to get feedback for

**Response:**
```json
[
    {
        "feedback_id": 123,
        "message_id": 456,
        "rating": 5,
        "feedback_comment": null,
        "model_name": "gpt-4o-mini",
        "model_provider": "openai",
        "temperature": 0.7,
        "max_tokens": 6000,
        "created_at": "2023-05-01T12:00:00Z",
        "updated_at": "2023-05-01T12:00:00Z"
    }
]
```

**Note:** Returns an empty array if no feedback exists for the chat.

**Error Responses:**
- `500 Internal Server Error`: Failed to retrieve chat feedback

## Feedback Features

### Rating System
- **Scale:** 1-5 star rating system
- **Required:** Rating is the only required field for feedback
- **Purpose:** Allows users to rate the quality of AI responses

### Model Context Tracking
The system optionally tracks:
- **Model Name:** The specific AI model used (e.g., "gpt-4o-mini")
- **Model Provider:** The provider of the model (e.g., "openai", "anthropic")
- **Temperature:** The creativity/randomness setting used
- **Max Tokens:** The maximum response length setting

### Update Behavior
- **Upsert Operation:** The POST endpoint either creates new feedback or updates existing feedback
- **Partial Updates:** When updating, only provided fields are modified
- **Timestamp Tracking:** Both creation and update timestamps are maintained

## Data Management

### Database Operations
- **Atomic Operations:** Feedback creation/updates are handled in database transactions
- **Referential Integrity:** Feedback is linked to specific messages via foreign keys
- **Soft Handling:** Missing optional fields are handled gracefully

### Error Handling
- **Comprehensive Logging:** All operations are logged for debugging
- **User-Friendly Messages:** Error responses provide clear information
- **Transaction Safety:** Failed operations are rolled back to maintain data consistency

## Usage Patterns

### Typical Workflow
1. User receives an AI-generated message
2. User provides rating (1-5 stars) via the frontend
3. Frontend calls `POST /feedback/message/{message_id}` with rating and model context
4. System stores or updates the feedback
5. Feedback can be retrieved later for analytics or user review

### Analytics Integration
Feedback data is used by the analytics system to:
- Track model performance across different configurations
- Identify patterns in user satisfaction
- Generate insights for model optimization 