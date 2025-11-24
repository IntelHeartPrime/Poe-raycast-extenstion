import {
  Detail,
  ActionPanel,
  Action,
  getPreferenceValues,
  showToast,
  Toast,
  Icon,
  Form,
  useNavigation,
} from "@raycast/api";
import { useState } from "react";
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

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [streamingResponse, setStreamingResponse] = useState("");
  const { push } = useNavigation();

  async function handleSendMessage(message: string) {
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

      // Initialize Poe client
      const poeClient = new PoeClient({
        apiKey: preferences.poeApiKey,
        botName: preferences.botName,
        proxyUrl: preferences.proxyUrl,
        refererUrl: preferences.refererUrl,
        appTitle: preferences.appTitle,
      });

      // Stream response
      let fullResponse = "";
      for await (const chunk of poeClient.streamChat(currentConv.messages)) {
        fullResponse += chunk;
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
  }

  function renderConversation() {
    const messages = conversation?.messages || [];
    
    let markdown = messages
      .map((msg) => {
        const role = msg.role === "user" ? "**👤 You**" : "**🤖 " + preferences.botName + "**";
        const time = new Date(msg.timestamp).toLocaleTimeString("zh-CN", {
          hour: "2-digit",
          minute: "2-digit",
        });
        return `${role} _${time}_\n\n${msg.content}\n\n---\n`;
      })
      .join("\n");

    // Show streaming response
    if (streamingResponse) {
      const time = new Date().toLocaleTimeString("zh-CN", {
        hour: "2-digit",
        minute: "2-digit",
      });
      markdown += `\n**🤖 ${preferences.botName}** _${time}_\n\n${streamingResponse}█\n\n---\n`;
    }

    if (!markdown) {
      markdown = `# 💬 Chat with ${preferences.botName}\n\n按 **⌘ + Enter** 开始发送消息...`;
    }

    return markdown;
  }

  return (
    <Detail
      markdown={renderConversation()}
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
            onAction={() => {
              setConversation(null);
              setStreamingResponse("");
              showToast(Toast.Style.Success, "已开始新对话");
            }}
          />
          {conversation && conversation.messages.length > 0 && (
            <Action.CopyToClipboard
              title="复制最后回复"
              icon={Icon.Clipboard}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
              content={
                conversation.messages[conversation.messages.length - 1]?.content || ""
              }
            />
          )}
        </ActionPanel>
      }
      metadata={
        conversation && (
          <Detail.Metadata>
            <Detail.Metadata.Label title="Bot" text={conversation.botName} />
            <Detail.Metadata.Label
              title="消息数"
              text={`${conversation.messages.length} 条`}
            />
            <Detail.Metadata.Separator />
            <Detail.Metadata.Label
              title="开始时间"
              text={new Date(conversation.createdAt).toLocaleString("zh-CN")}
            />
          </Detail.Metadata>
        )
      }
    />
  );
}

function MessageInput({ onSubmit }: { onSubmit: (message: string) => void }) {
  const { pop } = useNavigation();

  function handleSubmit(values: { message: string }) {
    if (values.message.trim()) {
      onSubmit(values.message);
      pop();
    }
  }

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="发送消息"
            icon={Icon.ArrowRight}
            onSubmit={handleSubmit}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="message"
        title="消息"
        placeholder="输入你想对 AI 说的话..."
        autoFocus
      />
    </Form>
  );
}
