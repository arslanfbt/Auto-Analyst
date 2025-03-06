### Chat Routes Overview

These routes handle chat interactions, message processing, user management, and debugging.

---

### **Chat Management**

#### **1. Create a New Chat**
**Endpoint:** `POST /chats`  
**Description:** Creates a new chat session.  
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
  "chat_id": 456,
  "title": "New Chat",
  "created_at": "2023-05-01T12:00:00Z",
  "user_id": 123
}
```
**Process Flow:**  
1. Create a new chat for the given user.  
2. Return the chat details.  

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
**Process Flow:**  
1. Retrieve chat details.  
2. Validate user access if `user_id` is provided.  
3. Fetch all messages in the chat.  
4. Return the chat with its messages.  

---

#### **3. List Recent Chats**
**Endpoint:** `GET /chats`  
**Description:** Retrieves a list of recent chats, optionally filtered by user ID.  
**Query Parameters:**  
- `user_id` (Optional for filtering by user)  
- `limit` (Maximum number of chats, default: 10)  
- `offset` (For pagination, default: 0)  
**Response:**  
```json
[
  {
    "chat_id": 456,
    "title": "New Chat",
    "created_at": "2023-05-01T12:00:00Z",
    "user_id": 123
  }
]
```
**Process Flow:**  
1. Fetch recent chats.  
2. Apply filters and pagination.  
3. Return the list of chats.  

---

#### **4. Update a Chat**
**Endpoint:** `PUT /chats/{chat_id}`  
**Description:** Updates a chat’s title or user ID.  
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
**Process Flow:**  
1. Update the chat’s title or user ID.  
2. Return the updated details.  

---

#### **5. Delete a Chat**
**Endpoint:** `DELETE /chats/{chat_id}`  
**Description:** Deletes a chat and all its messages.  
**Path Parameter:** `chat_id` (ID of the chat to delete)  
**Query Parameter:** `user_id` (Optional for access control)  
**Response:**  
```json
{
  "message": "Chat 456 deleted successfully"
}
```
**Process Flow:**  
1. Validate if the chat exists and if the user has access.  
2. Delete the chat and associated messages.  
3. Return a success message.  

---

#### **6. Search Chats**
**Endpoint:** `GET /chats/search/`  
**Description:** Searches chats based on a query string.  
**Query Parameters:**  
- `query` (Search term)  
- `user_id` (Optional filter)  
- `limit` (Max results)  
**Response:**  
```json
[
  {
    "chat_id": 456,
    "title": "Chat about machine learning",
    "created_at": "2023-05-01T12:00:00Z",
    "user_id": 123
  }
]
```
**Process Flow:**  
1. Search chat titles and messages for the query.  
2. Filter by `user_id` if provided.  
3. Apply a result limit.  
4. Return the matching chats.  

---

#### **7. Cleanup Empty Chats**
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
**Process Flow:**  
1. Identify chats with no messages.  
2. Delete those chats.  
3. Return the count of deleted chats.  

---

### **Message Management**



#### **1. Send a Message and Get AI Response**
**Endpoint:** `POST /chats/{chat_id}/message`  
**Description:** Sends a message and receives an AI-generated response.  
**Path Parameter:** `chat_id` (ID of the chat)  
**Request Body:**  
**Process Flow:**  
1. Verify chat existence and user access.  
2. Store the user message.  
3. Generate an AI response via `ai_manager`.  
4. Track model usage metrics.  
5. Store the AI response.  
6. Update the chat title if it's the first or second message.  
7. Return both messages.  

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
**Process Flow:**  
1. Check if a user with the email exists.  
2. Create a new user if not found.  
3. Return the user details.  

---

### **Debugging**

#### **1. Test Model Usage Tracking**
**Endpoint:** `POST /chats/debug/test-model-usage`  
**Query Parameters:**  
- `model_name`: Model to test  
- `user_id`: Optional  
**Response:**  
```json
{
  "success": true,
  "message": "Model usage tracking test completed",
  "response": "This is a test response",
  "usage_recorded": {
    "usage_id": 123,
    "model_name": "gpt-4",
    "tokens": 50,
    "cost": 0.0005,
    "timestamp": "2023-05-01T12:00:00Z"
  }
}
```
**Process Flow:**  
1. Generate a test prompt.  
2. Call AI manager.  
3. Fetch usage data.  
4. Return test results.