# Schema Design Explanation

The database schema is designed for efficient querying and retrieval, structured as follows:

## Users Table
- **Purpose**: Stores user information for authentication.
- **Indexes**: Indexed by username and email for fast lookups.

## Chats Table
- **Purpose**: Represents chat sessions with unique session IDs.
- **Features**:
  - Includes timestamps for creation and updates.
  - Linked to users (optional) for user-specific history.
  - Includes archiving functionality to hide old chats.
  - Stores dataset name for context.

## Messages Table
- **Purpose**: Stores individual messages within chat sessions.
- **Features**:
  - Includes sender information (user or AI).
  - Stores agent name for AI responses.
  - Includes timestamps for chronological ordering.
  - Has an error flag for tracking problematic responses.

### Schema Capabilities
- **Fast Retrieval**: Quick access to chat history by session ID.
- **Efficient Searching**: Search across message content effectively.
- **Pagination and Sorting**: Supports pagination and sorting by timestamp.
- **User-Specific Filtering**: Allows filtering based on user-specific criteria.
- **Archiving**: Enables archiving of old chats without deletion.

This implementation provides a solid foundation for persistent chat history storage that can scale with your application.