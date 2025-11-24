# Project Structure

## Overview
This Raycast extension allows users to interact with Poe AI bots and automatically manage conversation history.

## Directory Structure

```
poe-talk/
├── src/
│   ├── poe-talking-ask-ai.ts      # Main command - Ask AI
│   ├── poe-talking-history.tsx    # History browser command
│   └── utils/
│       ├── history.ts              # Conversation storage utilities
│       └── poe-client.ts           # Poe API client wrapper
├── assets/
│   └── extension-icon.png          # Extension icon
├── package.json                    # Extension manifest & dependencies
├── tsconfig.json                   # TypeScript configuration
├── README.md                       # Main documentation
├── USAGE.md                        # User guide
└── CHANGELOG.md                    # Version history
```

## Core Files

### Commands

#### `src/poe-talking-ask-ai.ts`
- **Type**: No-view command
- **Purpose**: Send a message to Poe AI and save conversation
- **Features**:
  - Accepts message as argument
  - Calls Poe API with configured bot
  - Saves conversation to local storage
  - Copies response to clipboard
  - Shows toast notifications for status

#### `src/poe-talking-history.tsx`
- **Type**: View command (React)
- **Purpose**: Browse and manage conversation history
- **Features**:
  - List all saved conversations
  - Search conversations
  - View conversation details
  - Delete conversations
  - Refresh list

### Utilities

#### `src/utils/poe-client.ts`
- **Purpose**: Wrapper for Poe API using OpenAI SDK
- **Key Functions**:
  - `PoeClient` class for API interactions
  - `streamChat()` - Stream responses (async generator)
  - `chat()` - Get complete response
  - Handles authentication and headers

#### `src/utils/history.ts`
- **Purpose**: Manage conversation storage
- **Key Functions**:
  - `saveConversation()` - Save conversation to JSON file
  - `loadConversation()` - Load specific conversation
  - `listConversations()` - Get all conversations
  - `deleteConversation()` - Remove conversation file
  - `generateConversationId()` - Create unique IDs
  - `generateConversationTitle()` - Auto-generate titles

## Data Models

### Message
```typescript
interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}
```

### Conversation
```typescript
interface Conversation {
  id: string;                  // Unique identifier
  title: string;               // Display title
  messages: Message[];         // Conversation messages
  createdAt: number;           // Creation timestamp
  updatedAt: number;           // Last update timestamp
  botName: string;             // Bot used for conversation
}
```

### Preferences
```typescript
interface Preferences {
  poeApiKey: string;           // Required: User's Poe API key
  botName: string;             // Required: Bot to use
  refererUrl?: string;         // Optional: For leaderboard
  appTitle?: string;           // Optional: For leaderboard
}
```

## Configuration

### package.json - Commands
```json
{
  "commands": [
    {
      "name": "poe-talking-ask-ai",
      "mode": "no-view",
      "arguments": [{ "name": "message", "type": "text" }]
    },
    {
      "name": "poe-talking-history",
      "mode": "view"
    }
  ]
}
```

### package.json - Preferences
- `poeApiKey` (password, required) - API authentication
- `botName` (textfield, required) - Default: "Claude-Sonnet-4.5"
- `refererUrl` (textfield, optional) - HTTP-Referer header
- `appTitle` (textfield, optional) - X-Title header

## Data Flow

### Ask AI Command Flow
1. User enters message in Raycast
2. Command validates API key and message
3. Create new conversation with user message
4. Call Poe API via `PoeClient.chat()`
5. Receive AI response
6. Add assistant message to conversation
7. Save conversation to file system
8. Copy response to clipboard
9. Show success toast

### History Browser Flow
1. Command loads on open
2. Call `listConversations()` to get all files
3. Display in list with search/filter
4. User can:
   - View: Push to detail view with markdown
   - Delete: Confirm → `deleteConversation()` → refresh list
   - Refresh: Reload conversation list

## Storage System

### Location
- macOS: `~/Library/Application Support/com.raycast.macos/extensions/poe-talk/conversations/`
- Files: `{conversationId}.json`

### File Format
Each conversation is stored as a JSON file:
```json
{
  "id": "conv_1732435200000_abc123xyz",
  "title": "First 50 chars of first message...",
  "messages": [...],
  "createdAt": 1732435200000,
  "updatedAt": 1732435200000,
  "botName": "Claude-Sonnet-4.5"
}
```

### Operations
- **Create**: Generate ID, create file
- **Read**: Load JSON from file
- **Update**: Overwrite existing file
- **Delete**: Remove file from disk
- **List**: Read directory, parse all JSON files

## API Integration

### Poe API via OpenAI SDK
- Base URL: `https://api.poe.com/v1`
- Authentication: Bearer token (API key)
- Model: Bot name (e.g., "Claude-Sonnet-4.5")
- Messages: Array of `{role, content}` objects

### Headers
- `Authorization`: Bearer {apiKey}
- `HTTP-Referer`: {refererUrl} (optional)
- `X-Title`: {appTitle} (optional)

### Rate Limits
- 500 requests per minute per user
- Points charged per request

## Dependencies

### Runtime
- `@raycast/api`: ^1.103.7 - Raycast SDK
- `@raycast/utils`: ^1.17.0 - Utility functions
- `openai`: Latest - OpenAI SDK for Poe API

### Development
- `typescript`: ^5.8.2
- `eslint`: ^9.22.0
- `prettier`: ^3.5.3
- `@raycast/eslint-config`: ^2.0.4

## Build & Development

### Commands
```bash
npm install          # Install dependencies
npm run dev          # Development mode with hot reload
npm run build        # Production build
npm run lint         # Run linter
npm run fix-lint     # Fix lint issues
```

### Build Output
- Compiled files in `dist/`
- Type definitions generated
- Ready for Raycast to load

## Error Handling

### Validation
- Empty message → Show HUD error
- Missing API key → Show HUD error
- Invalid bot name → API error caught

### API Errors
- Network errors → Toast with error message
- Authentication errors → Show API key error
- Rate limit errors → Show rate limit message

### File System Errors
- Directory creation → Automatic with `recursive: true`
- Read errors → Log to console, continue
- Write errors → Toast with error message
- Delete errors → Toast with error message

## Testing Checklist

- [ ] Ask AI with valid message
- [ ] Ask AI with empty message
- [ ] Ask AI without API key configured
- [ ] Browse empty history
- [ ] Browse with conversations
- [ ] View conversation details
- [ ] Delete conversation
- [ ] Search conversations
- [ ] Refresh conversation list
- [ ] Multiple consecutive messages
- [ ] Different bot names
- [ ] Long messages
- [ ] Special characters in messages

## Future Enhancements

Potential features to add:
- Continue existing conversations (multi-turn)
- Export conversations to markdown/PDF
- Share conversations via link
- Custom conversation titles
- Tags/categories for conversations
- Full-text search in messages
- Conversation statistics
- Token/cost tracking
- Streaming display in HUD/view
- Voice input support
- Image attachment support
- Multiple API key profiles
