import {
  ActionPanel,
  Action,
  getPreferenceValues,
  showToast,
  Toast,
  Icon,
  Detail,
  Form,
  useNavigation,
} from "@raycast/api";
import { useState, useMemo, useCallback, useRef } from "react";
import { PoeClient } from "./utils/poe-client";
import {
  Conversation,
  Message,
  saveConversation,
  generateConversationId,
  generateConversationTitle,
} from "./utils/history";

interface Preferences {
  poeApiKey: string;
  botName: string;
  proxyUrl?: string;
  refererUrl?: string;
  appTitle?: string;
}

// Helper function to format relative time
function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return "刚刚";
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 7) return `${days}天前`;
  
  return new Date(timestamp).toLocaleDateString("zh-CN", {
    month: "short",
    day: "numeric",
  });
}

// Helper function to count words/characters
function getWordCount(text: string): { chars: number; words: number } {
  const chars = text.length;
  // Simple word count for mixed Chinese/English text
  const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
  const englishWords = (text.match(/[a-zA-Z]+/g) || []).length;
  return { chars, words: chineseChars + englishWords };
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [streamingResponse, setStreamingResponse] = useState("");
  const [isSaved, setIsSaved] = useState(false);
  const { push } = useNavigation();
  const poeClientRef = useRef<PoeClient | null>(null);
  const streamUpdateTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleSendMessage = useCallback(async (message: string) => {
    if (!message.trim()) {
      showToast(Toast.Style.Failure, "请输入消息");
      return;
    }

    if (!preferences.poeApiKey) {
      showToast(Toast.Style.Failure, "请在扩展设置中配置 Poe API Key");
      return;
    }

    setIsLoading(true);
    setStreamingResponse("");
    setIsSaved(false);

    try {
      // Create user message
      const userMessage: Message = {
        role: "user",
        content: message.trim(),
        timestamp: Date.now(),
      };

      // Create or update conversation
      let currentConv = conversation;
      if (!currentConv) {
        currentConv = {
          id: generateConversationId(),
          title: generateConversationTitle(message.trim()),
          messages: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
          botName: preferences.botName,
        };
      }

      currentConv.messages.push(userMessage);
      currentConv.updatedAt = Date.now();
      setConversation({ ...currentConv });

      // Initialize or reuse Poe client
      if (!poeClientRef.current) {
        poeClientRef.current = new PoeClient({
          apiKey: preferences.poeApiKey,
          botName: preferences.botName,
          proxyUrl: preferences.proxyUrl,
          refererUrl: preferences.refererUrl,
          appTitle: preferences.appTitle,
        });
      }

      // Stream response with debounced updates
      let fullResponse = "";
      let pendingUpdate = "";
      
      for await (const chunk of poeClientRef.current.streamChat(currentConv.messages)) {
        fullResponse += chunk;
        pendingUpdate += chunk;
        
        // Debounce UI updates for better performance
        if (streamUpdateTimerRef.current) {
          clearTimeout(streamUpdateTimerRef.current);
        }
        
        streamUpdateTimerRef.current = setTimeout(() => {
          setStreamingResponse(fullResponse);
          pendingUpdate = "";
        }, 50); // Update every 50ms max
      }
      
      // Clear any pending timer and do final update
      if (streamUpdateTimerRef.current) {
        clearTimeout(streamUpdateTimerRef.current);
      }
      if (pendingUpdate) {
        setStreamingResponse(fullResponse);
      }

      // Add assistant message
      const assistantMessage: Message = {
        role: "assistant",
        content: fullResponse,
        timestamp: Date.now(),
      };

      currentConv.messages.push(assistantMessage);
      currentConv.updatedAt = Date.now();

      // Save conversation
      await saveConversation(currentConv);
      setConversation({ ...currentConv });
      setStreamingResponse("");
      setIsSaved(true);

      showToast(Toast.Style.Success, "对话已保存");
    } catch (error) {
      console.error("Error communicating with Poe:", error);
      showToast(
        Toast.Style.Failure,
        "错误",
        error instanceof Error ? error.message : "无法与 Poe 通信"
      );
    } finally {
      setIsLoading(false);
    }
  }, [conversation, preferences, streamingResponse]);

  const renderedMarkdown = useMemo(() => {
    const messages = conversation?.messages || [];
    
    if (messages.length === 0 && !streamingResponse) {
      return `# 💬 开始与 ${preferences.botName} 对话\n\n---\n\n✨ **快速开始**\n\n• 按 ⌘+Enter 发送消息\n• 所有内容支持选中复制\n• 支持 Markdown 格式\n• 代码块自动高亮\n\n---\n\n💡 **提示**: 对话会自动保存到历史记录`;
    }
    
    const parts: string[] = [];
    let messageIndex = 0;
    
    for (const msg of messages) {
      messageIndex++;
      const time = new Date(msg.timestamp).toLocaleTimeString("zh-CN", {
        hour: "2-digit",
        minute: "2-digit",
      });
      const relativeTime = formatRelativeTime(msg.timestamp);
      const { chars, words } = getWordCount(msg.content);
      
      if (msg.role === "user") {
        parts.push(
          `### 💭 #${messageIndex} You\n\n` +
          `> 📅 ${time} · ${relativeTime} · ${chars}字\n\n` +
          `${msg.content}\n\n` +
          `---\n\n`
        );
      } else {
        parts.push(
          `### 🤖 #${messageIndex} ${preferences.botName}\n\n` +
          `> 📅 ${time} · ${relativeTime} · ${chars}字\n\n` +
          `${msg.content}\n\n` +
          `---\n\n`
        );
      }
    }

    // Show streaming response
    if (streamingResponse) {
      messageIndex++;
      const time = new Date().toLocaleTimeString("zh-CN", {
        hour: "2-digit",
        minute: "2-digit",
      });
      const { chars } = getWordCount(streamingResponse);
      
      parts.push(
        `### 🤖 #${messageIndex} ${preferences.botName}\n\n` +
        `> ⚡ 正在输入... · 已生成 ${chars}字\n\n` +
        `${streamingResponse}█\n\n` +
        `---\n\n`
      );
    }

    return parts.join("");
  }, [conversation?.messages, streamingResponse, preferences.botName]);

  const handleNewConversation = useCallback(() => {
    setConversation(null);
    setStreamingResponse("");
    setIsSaved(false);
    poeClientRef.current = null; // Reset client
    showToast(Toast.Style.Success, "已开始新对话");
  }, []);

  const lastMessageContent = useMemo(
    () => conversation?.messages[conversation.messages.length - 1]?.content || "",
    [conversation?.messages]
  );

  const allMessagesText = useMemo(
    () =>
      conversation?.messages
        .map((msg) => {
          const role = msg.role === "user" ? "You" : preferences.botName;
          const time = new Date(msg.timestamp).toLocaleTimeString("zh-CN");
          return `${role} ${time}\n${msg.content}`;
        })
        .join("\n\n---\n\n") || "",
    [conversation?.messages, preferences.botName]
  );

  const conversationMetadata = useMemo(
    () => {
      if (!conversation) return undefined;
      
      const userMessages = conversation.messages.filter(m => m.role === "user");
      const aiMessages = conversation.messages.filter(m => m.role === "assistant");
      
      const totalChars = conversation.messages.reduce((sum, msg) => {
        return sum + msg.content.length;
      }, 0);
      
      const avgChars = Math.round(totalChars / conversation.messages.length);
      
      const duration = Date.now() - conversation.createdAt;
      const durationMinutes = Math.round(duration / 60000);
      
      return (
        <Detail.Metadata>
          <Detail.Metadata.Label title="🤖 Bot" text={conversation.botName} />
          <Detail.Metadata.Separator />
          
          <Detail.Metadata.Label 
            title="💬 消息数" 
            text={`${conversation.messages.length} 条`} 
          />
          <Detail.Metadata.Label 
            title="分布" 
            text={`👤 ${userMessages.length} · 🤖 ${aiMessages.length}`} 
          />
          <Detail.Metadata.Separator />
          
          <Detail.Metadata.Label 
            title="📝 总字数" 
            text={`${totalChars.toLocaleString()} 字`} 
          />
          <Detail.Metadata.Label 
            title="平均" 
            text={`${avgChars} 字/条`} 
          />
          <Detail.Metadata.Separator />
          
          <Detail.Metadata.Label
            title="⏱️ 开始时间"
            text={new Date(conversation.createdAt).toLocaleString("zh-CN", {
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
            })}
          />
          <Detail.Metadata.Label
            title="持续时间"
            text={durationMinutes < 60 ? `${durationMinutes}分钟` : `${Math.round(durationMinutes/60)}小时`}
          />
          <Detail.Metadata.Separator />
          
          {isSaved && (
            <Detail.Metadata.Label title="💾 状态" icon="✅" text="已保存" />
          )}
        </Detail.Metadata>
      );
    },
    [conversation, isSaved]
  );

  return (
    <Detail
      markdown={renderedMarkdown}
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action
            title="发送消息"
            icon={Icon.Message}
            shortcut={{ modifiers: ["cmd"], key: "return" }}
            onAction={() => {
              push(<MessageInput onSubmit={handleSendMessage} />);
            }}
          />
          <Action
            title="新对话"
            icon={Icon.Plus}
            shortcut={{ modifiers: ["cmd"], key: "n" }}
            onAction={handleNewConversation}
          />
          {conversation && conversation.messages.length > 0 && (
            <>
              <Action.CopyToClipboard
                title="复制最后回复"
                icon={Icon.Clipboard}
                shortcut={{ modifiers: ["cmd"], key: "c" }}
                content={lastMessageContent}
              />
              <Action.CopyToClipboard
                title="复制全部对话"
                icon={Icon.Document}
                shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
                content={allMessagesText}
              />
            </>
          )}
        </ActionPanel>
      }
      metadata={conversationMetadata}
    />
  );
}

function MessageInput({ onSubmit }: { onSubmit: (message: string) => void }) {
  const { pop } = useNavigation();
  const [message, setMessage] = useState("");

  function handleSubmit() {
    if (message.trim()) {
      onSubmit(message);
      pop();
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action
            title="发送消息"
            icon={Icon.ArrowRight}
            onAction={handleSubmit}
          />
          <Action
            title="取消"
            icon={Icon.XMarkCircle}
            shortcut={{ modifiers: ["cmd"], key: "w" }}
            onAction={pop}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="message"
        title="消息"
        placeholder="输入框，常在的输入框..."
        value={message}
        onChange={setMessage}
        autoFocus
      />
      <Form.Description text="💡 提示：按 Enter 换行，按 ⌘+Enter 或点击按钮发送消息" />
    </Form>
  );
}
