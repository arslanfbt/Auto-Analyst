### Chat Routes Overview

These routes handle chat interactions, message processing, user management, and debugging.

---

### **Chat Management**

#### **1. Create a New Chat**
**Endpoint:** `POST /chats/`  
**Description:** Creates a new chat session.  
**Request Body:**  
```json
{
  "user_id": 123
}
```
**Response:**  
```json
{
  "chat_id": 456,
  "user_id": 123,
  "title": "New Chat",
  "created_at": "2023-05-01T12:00:00Z"
}
```

---

#### **2. Retrieve a Chat by ID**
**Endpoint:** `GET /chats/{chat_id}`  
**Description:** Fetches a specific chat along with its messages.  
**Path Parameter:** `chat_id` (ID of the chat)  
**Query Parameter:** `user_id` (Optional for access control)  
**Response:**  
```json
{
  "chat_id": 456,
  "title": "New Chat",
  "created_at": "2023-05-01T12:00:00Z",
  "user_id": 123,
  "messages": [
    {
      "message_id": 789,
      "chat_id": 456,
      "content": "Hello, how can I help?",
      "sender": "ai",
      "timestamp": "2023-05-01T12:01:00Z"
    }
  ]
}
```

---

#### **3. List Recent Chats**
**Endpoint:** `GET /chats/`  
**Description:** Retrieves a list of recent chats, optionally filtered by user ID.  
**Query Parameters:**  
- `user_id` (Optional for filtering by user)  
- `limit` (Maximum number of chats, default: 10, max: 100)  
- `offset` (For pagination, default: 0)  
**Response:**  
```json
[
  {
    "chat_id": 456,
    "user_id": 123,
    "title": "New Chat",
    "created_at": "2023-05-01T12:00:00Z"
  }
]
```

---

#### **4. Update a Chat**
**Endpoint:** `PUT /chats/{chat_id}`  
**Description:** Updates a chat's title or user ID.  
**Path Parameter:** `chat_id` (ID of the chat to update)  
**Request Body:**  
```json
{
  "title": "Updated Chat Title",
  "user_id": 123
}
```
**Response:**  
```json
{
  "chat_id": 456,
  "title": "Updated Chat Title",
  "created_at": "2023-05-01T12:00:00Z",
  "user_id": 123
}
```

---

#### **5. Delete a Chat**
**Endpoint:** `DELETE /chats/{chat_id}`  
**Description:** Deletes a chat and all its messages while preserving model usage records.  
**Path Parameter:** `chat_id` (ID of the chat to delete)  
**Query Parameter:** `user_id` (Optional for access control)  
**Response:**  
```json
{
  "message": "Chat 456 deleted successfully",
  "preserved_model_usage": true
}
```

---

#### **6. Cleanup Empty Chats**
**Endpoint:** `POST /chats/cleanup-empty`  
**Description:** Deletes empty chats for a user.  
**Request Body:**  
```json
{
  "user_id": 123,
  "is_admin": false
}
```
**Response:**  
```json
{
  "message": "Deleted 5 empty chats"
}
```

---

### **Message Management**

#### **1. Add Message to Chat**
**Endpoint:** `POST /chats/{chat_id}/messages`  
**Description:** Adds a message to an existing chat.  
**Path Parameter:** `chat_id` (ID of the chat)  
**Query Parameter:** `user_id` (Optional for access control)  
**Request Body:**  
```json
{
  "content": "Hello, I need help with data analysis",
  "sender": "user"
}
```
**Response:**  
```json
{
  "message_id": 789,
  "chat_id": 456,
  "content": "Hello, I need help with data analysis",
  "sender": "user",
  "timestamp": "2023-05-01T12:01:00Z"
}
```

---

### **User Management**

#### **1. Create or Retrieve a User**
**Endpoint:** `POST /chats/users`  
**Description:** Creates a new user or retrieves an existing one based on email.  
**Request Body:**  
```json
{
  "username": "john_doe",
  "email": "john@example.com"
}
```
**Response:**  
```json
{
  "user_id": 123,
  "username": "john_doe",
  "email": "john@example.com",
  "created_at": "2023-05-01T12:00:00Z"
}
```

---

### **Debugging**

#### **1. Test Model Usage Tracking**
**Endpoint:** `POST /chats/debug/test-model-usage`  
**Query Parameters:**  
- `model_name`: Model to test (default: "gpt-3.5-turbo")  
- `user_id`: Optional user ID  
**Response:**  
```json
{
  "success": true,
  "message": "Model usage tracking test completed",
  "response": "This is a test response",
  "usage_recorded": {
    "usage_id": 123,
    "model_name": "gpt-3.5-turbo",
    "tokens": 50,
    "cost": 0.0005,
    "timestamp": "2023-05-01T12:00:00Z"
  }
}
```