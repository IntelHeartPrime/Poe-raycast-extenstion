# Poe Talk - Raycast Extension

A Raycast extension to talk with Poe AI bots and automatically save conversation history.

## Features

- 🤖 **Ask Poe AI**: Quick command to send messages to any Poe bot
- 💬 **Conversation History**: Automatically saves all conversations locally
- 📝 **Browse & Manage**: View and delete past conversations
- 🔐 **Secure**: Uses your personal Poe API key
- ⚡ **Fast**: Built with streaming support for quick responses

## Setup

### 1. Get Your Poe API Key

1. Visit [poe.com/api_key](https://poe.com/api_key)
2. Sign in to your Poe account
3. Copy your API key

### 2. Configure the Extension

1. Open Raycast preferences (⌘ + ,)
2. Navigate to Extensions → Poe Talk
3. Enter your Poe API key
4. Choose your preferred bot (e.g., Claude-Sonnet-4.5, GPT-5, Grok-4)
5. (Optional) Set Referer URL and App Title for leaderboard tracking

## Usage

### Chat with Poe AI (Interactive)

1. Open Raycast (⌘ + Space)
2. Type "Chat with Poe AI"
3. A chat window opens where you can:
   - Send messages by clicking "发送消息"
   - See the full conversation history
   - Continue the conversation with multiple turns
   - Start a new conversation (⌘ + N)
   - Copy the last response (⌘ + C)
4. All conversations are automatically saved

### Quick Ask Poe AI (Single Message)

1. Open Raycast (⌘ + Space)
2. Type "Quick Ask Poe AI"
3. Enter your message
4. The AI response will be copied to your clipboard
5. Conversation is automatically saved

### Browse Conversation History

1. Open Raycast (⌘ + Space)
2. Type "Browse Poe Conversations"
3. View all your past conversations
4. Click to view details or delete conversations

## Available Bots

Popular Poe bots you can use:
- `Claude-Sonnet-4.5` - Anthropic's Claude
- `Claude-Opus-4.1` - Claude Opus model
- `GPT-5` - OpenAI's GPT-5
- `Grok-4` - xAI's Grok
- `Imagen-4` - Google's image generation

## Storage

Conversations are stored locally at:
```
~/Library/Application Support/com.raycast.macos/extensions/poe-talk/conversations/
```

Each conversation is saved as a JSON file with:
- Conversation ID and title
- All messages (user and AI)
- Timestamps
- Bot name used

## Leaderboard Attribution (Optional)

If you want your usage to appear on [Poe's leaderboard](https://poe.com/leaderboard):

1. Set **Referer URL** to your website/app URL
2. Set **App Title** to your application name

These headers help attribute your API requests to your application.

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build
```

## Requirements

- Raycast
- Poe account with API access
- macOS or Windows

## License

MIT