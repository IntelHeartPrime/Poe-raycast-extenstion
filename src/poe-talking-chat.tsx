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
  LaunchProps,
  popToRoot,
} from "@raycast/api";
import { useState, useMemo, useCallback, useRef, useEffect } from "react";
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

// Cache for formatted times to avoid recalculation
const timeFormatCache = new Map<string, string>();

// Helper function to format relative time with caching
function formatRelativeTime(timestamp: number): string {
  const cacheKey = `${timestamp}_${Math.floor(Date.now() / 60000)}`; // Cache per minute
  
  if (timeFormatCache.has(cacheKey)) {
    return timeFormatCache.get(cacheKey)!;
  }
  
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  let result: string;
  if (minutes < 1) result = "刚刚";
  else if (minutes < 60) result = `${minutes}分钟前`;
  else if (hours < 24) result = `${hours}小时前`;
  else if (days < 7) result = `${days}天前`;
  else result = new Date(timestamp).toLocaleDateString("zh-CN", { month: "short", day: "numeric" });
  
  timeFormatCache.set(cacheKey, result);
  // Limit cache size
  if (timeFormatCache.size > 100) {
    const firstKey = timeFormatCache.keys().next().value;
    timeFormatCache.delete(firstKey);
  }
  
  return result;
}

// Cache for word count to avoid recalculation
const wordCountCache = new Map<string, { chars: number; words: number }>();

// Helper function to count words/characters with caching
function getWordCount(text: string): { chars: number; words: number } {
  if (wordCountCache.has(text)) {
    return wordCountCache.get(text)!;
  }
  
  const chars = text.length;
  // Optimized word count - only count if needed
  let chineseChars = 0;
  let englishWords = 0;
  
  // Only calculate detailed count for display purposes
  if (chars < 10000) { // Skip for very long texts
    for (let i = 0; i < chars; i++) {
      const code = text.charCodeAt(i);
      if (code >= 0x4e00 && code <= 0x9fa5) chineseChars++;
    }
    englishWords = (text.match(/[a-zA-Z]+/g) || []).length;
  }
  
  const result = { chars, words: chineseChars + englishWords };
  
  // Limit cache size
  if (wordCountCache.size > 50) {
    const firstKey = wordCountCache.keys().next().value;
    wordCountCache.delete(firstKey);
  }
  
  wordCountCache.set(text, result);
  return result;
}

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [streamingResponse, setStreamingResponse] = useState("");
  const [isSaved, setIsSaved] = useState(false);
  const poeClientRef = useRef<PoeClient | null>(null);
  const streamUpdateTimerRef = useRef<NodeJS.Timeout | null>(null);

  return <ChatView
    conversation={conversation}
    setConversation={setConversation}
    isLoading={isLoading}
    setIsLoading={setIsLoading}
    streamingResponse={streamingResponse}
    setStreamingResponse={setStreamingResponse}
    isSaved={isSaved}
    setIsSaved={setIsSaved}
    poeClientRef={poeClientRef}
    preferences={preferences}
  />;
}

function ChatView({
  conversation,
  setConversation,
  isLoading,
  setIsLoading,
  streamingResponse,
  setStreamingResponse,
  isSaved,
  setIsSaved,
  poeClientRef,
  preferences,
}: {
  conversation: Conversation | null;
  setConversation: (conv: Conversation | null) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  streamingResponse: string;
  setStreamingResponse: (response: string) => void;
  isSaved: boolean;
  setIsSaved: (saved: boolean) => void;
  poeClientRef: React.MutableRefObject<PoeClient | null>;
  preferences: Preferences;
}) {
  const { push, pop } = useNavigation();
  const [showInput, setShowInput] = useState(conversation === null || conversation.messages.length === 0);

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

      // Stream response with optimized throttling for smoother updates
      let fullResponse = "";
      let lastUpdateTime = Date.now();
      const minUpdateInterval = 100; // Update at most every 100ms for smoother experience
      let updatePending = false;
      
      for await (const chunk of poeClientRef.current.streamChat(currentConv.messages)) {
        fullResponse += chunk;
        
        const now = Date.now();
        
        // Throttle updates for better performance
        if (!updatePending && now - lastUpdateTime >= minUpdateInterval) {
          lastUpdateTime = now;
          updatePending = true;
          
          // Use setImmediate for non-blocking updates
          setImmediate(() => {
            setStreamingResponse(fullResponse);
            updatePending = false;
          });
        }
      }
      
      // Always do final update to ensure we show complete response
      setStreamingResponse(fullResponse);

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
  }, [conversation, preferences]);

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
  }, [
    conversation?.messages.length,
    conversation?.messages[conversation?.messages.length - 1]?.timestamp,
    streamingResponse,
    preferences.botName,
  ]);

  const handleNewConversation = useCallback(() => {
    setConversation(null);
    setStreamingResponse("");
    setIsSaved(false);
    setShowInput(true);
    poeClientRef.current = null; // Reset client
    showToast(Toast.Style.Success, "已开始新对话");
  }, []);

  const lastMessageContent = useMemo(
    () => conversation?.messages[conversation.messages.length - 1]?.content || "",
    [conversation?.messages.length]
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
    [conversation?.messages.length, preferences.botName]
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
    [
      conversation?.id,
      conversation?.messages.length,
      conversation?.createdAt,
      conversation?.botName,
      isSaved,
    ]
  );

  // 如果是新对话或没有消息，直接显示输入框
  if (showInput) {
    return (
      <MessageInput 
        onSubmit={(message) => {
          handleSendMessage(message);
          setShowInput(false);
        }}
        onCancel={() => {
          if (conversation && conversation.messages.length > 0) {
            setShowInput(false);
          } else {
            pop();
          }
        }}
      />
    );
  }

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
              setShowInput(true);
            }}
          />
          <Action
            title="关闭"
            icon={Icon.XMarkCircle}
            shortcut={{ modifiers: [], key: "escape" }}
            onAction={pop}
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

function MessageInput({ 
  onSubmit,
  onCancel 
}: { 
  onSubmit: (message: string) => void;
  onCancel?: () => void;
}) {
  const { pop } = useNavigation();
  const [message, setMessage] = useState("");

  function handleSubmit() {
    if (message.trim()) {
      onSubmit(message);
    }
  }

  function handleCancel() {
    if (onCancel) {
      onCancel();
    } else {
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
            shortcut={{ modifiers: ["cmd"], key: "return" }}
            onAction={handleSubmit}
          />
          <Action
            title="取消"
            icon={Icon.XMarkCircle}
            onAction={handleCancel}
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
        onKeyDown={(e) => {
          // Only handle pure ESC key (no modifiers)
          if (e.nativeEvent.key === "Escape" && !e.nativeEvent.shiftKey && !e.nativeEvent.ctrlKey && !e.nativeEvent.metaKey && !e.nativeEvent.altKey) {
            e.nativeEvent.preventDefault();
            e.nativeEvent.stopPropagation();
            handleCancel();
          }
        }}
      />
      <Form.Description text="💡 提示：按 Enter 换行，按 ⌘+Enter 发送消息，按 Esc 取消" />
    </Form>
  );
}
