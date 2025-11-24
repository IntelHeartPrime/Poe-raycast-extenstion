# Quick Start Guide

## Initial Setup

1. **Get your Poe API Key**
   - Go to https://poe.com/api_key
   - Copy your API key

2. **Install the extension in Raycast**
   ```bash
   npm install
   npm run dev
   ```

3. **Configure settings**
   - Open Raycast settings (⌘ + ,)
   - Find "Poe Talk" extension
   - Add your API key
   - Select your preferred bot (default: Claude-Sonnet-4.5)

## Commands

### 1. Ask Poe AI
**Usage**: Open Raycast → Type "Ask Poe AI" → Enter your message

**What happens**:
- Your message is sent to the configured Poe bot
- The response is automatically copied to your clipboard
- The conversation is saved to your local history

**Example**:
```
Ask Poe AI "Explain quantum computing in simple terms"
```

### 2. Browse Poe Conversations
**Usage**: Open Raycast → Type "Browse Poe Conversations"

**Features**:
- View all saved conversations
- Search by title or content
- Sort by most recent
- Delete unwanted conversations
- View full conversation details

**Keyboard shortcuts**:
- `⌘ + Delete` - Delete selected conversation
- `⌘ + R` - Refresh list
- `Enter` - View conversation details

## Configuration Options

### Required Settings

| Setting | Description | Example |
|---------|-------------|---------|
| Poe API Key | Your personal API key from Poe | `pk_***` |
| Bot Name | The Poe bot to use | `Claude-Sonnet-4.5` |

### Optional Settings

| Setting | Description | Purpose |
|---------|-------------|---------|
| Referer URL | Your app/website URL | Leaderboard attribution |
| App Title | Your app display name | Leaderboard display |

## Popular Bot Names

- **Claude Models**:
  - `Claude-Sonnet-4.5` (recommended)
  - `Claude-Opus-4.1`
  - `Claude-3.5-Haiku`

- **OpenAI Models**:
  - `GPT-5`
  - `GPT-4o`
  - `o1`

- **Other Models**:
  - `Grok-4` (xAI)
  - `Gemini-Pro` (Google)
  - `Imagen-4` (Image generation)

## Where is data stored?

Conversations are stored locally at:
- **macOS**: `~/Library/Application Support/com.raycast.macos/extensions/poe-talk/conversations/`
- **Windows**: `%APPDATA%\Raycast\extensions\poe-talk\conversations\`

Each conversation is a JSON file containing:
```json
{
  "id": "conv_1234567890_abc123",
  "title": "Explain quantum computing...",
  "messages": [
    {
      "role": "user",
      "content": "Your message",
      "timestamp": 1234567890000
    },
    {
      "role": "assistant",
      "content": "AI response",
      "timestamp": 1234567891000
    }
  ],
  "createdAt": 1234567890000,
  "updatedAt": 1234567891000,
  "botName": "Claude-Sonnet-4.5"
}
```

## Troubleshooting

### "Please configure Poe API Key" error
- Go to Raycast settings → Poe Talk
- Make sure your API key is entered correctly
- Verify the key at https://poe.com/api_key

### "Cannot communicate with Poe" error
- Check your internet connection
- Verify your API key is valid
- Make sure the bot name is correct
- Check if you have available Poe credits

### Conversations not showing up
- Check the storage directory exists
- Verify file permissions
- Try refreshing the list (⌘ + R)

## Tips & Tricks

1. **Quick Access**: Create a Raycast hotkey for "Ask Poe AI"
2. **Multiple Bots**: Change the bot in settings to experiment with different models
3. **Clipboard Integration**: Responses are auto-copied, just paste (⌘ + V) to use them
4. **Search History**: Use the search bar in history to find old conversations
5. **Backup**: The conversations folder can be backed up/synced to preserve history

## API Usage & Costs

- Requests use your Poe account's points
- Rate limit: 500 requests per minute per user
- Check your usage at https://poe.com/settings
- Consider upgrading to Poe subscription for more points

## Privacy & Security

- ✅ API key stored securely in Raycast preferences
- ✅ Conversations stored locally only
- ✅ No data sent to third parties
- ✅ You own all your conversation data
- ⚠️ API key gives access to your Poe account - keep it secure

## Need Help?

- Check the main README.md for more details
- Visit Poe documentation: https://creator.poe.com/docs
- Raycast documentation: https://developers.raycast.com
