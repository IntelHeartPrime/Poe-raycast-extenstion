import {
  List,
  ActionPanel,
  Action,
  Icon,
  showToast,
  Toast,
  confirmAlert,
  Alert,
  Color,
} from "@raycast/api";
import { useState, useEffect } from "react";
import { listConversations, deleteConversation, Conversation } from "./utils/history";

export default function Command() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  async function loadConversations() {
    setIsLoading(true);
    try {
      const convs = await listConversations();
      setConversations(convs);
    } catch (error) {
      console.error("Failed to load conversations:", error);
      showToast(Toast.Style.Failure, "加载对话历史失败");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadConversations();
  }, []);

  async function handleDelete(conversation: Conversation) {
    const confirmed = await confirmAlert({
      title: "删除对话",
      message: `确定要删除 "${conversation.title}" 吗？`,
      primaryAction: {
        title: "删除",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      try {
        await deleteConversation(conversation.id);
        await showToast(Toast.Style.Success, "对话已删除");
        await loadConversations();
      } catch (error) {
        console.error("Failed to delete conversation:", error);
        showToast(Toast.Style.Failure, "删除失败");
      }
    }
  }

  function formatDate(timestamp: number): string {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInHours = diffInMs / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
    } else if (diffInHours < 24 * 7) {
      return date.toLocaleDateString("zh-CN", { weekday: "short", hour: "2-digit", minute: "2-digit" });
    } else {
      return date.toLocaleDateString("zh-CN", { year: "numeric", month: "short", day: "numeric" });
    }
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="搜索对话...">
      {conversations.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.SpeechBubble}
          title="暂无对话历史"
          description="开始一个新对话来创建历史记录"
        />
      ) : (
        conversations.map((conversation) => (
          <List.Item
            key={conversation.id}
            icon={Icon.Message}
            title={conversation.title}
            subtitle={`${conversation.messages.length} 条消息`}
            accessories={[
              {
                tag: {
                  value: conversation.botName,
                  color: Color.Blue,
                },
              },
              {
                text: formatDate(conversation.updatedAt),
                icon: Icon.Clock,
              },
            ]}
            actions={
              <ActionPanel>
                <Action.Push
                  title="查看对话"
                  icon={Icon.Eye}
                  target={<ConversationDetail conversation={conversation} />}
                />
                <Action
                  title="删除对话"
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={{ modifiers: ["cmd"], key: "delete" }}
                  onAction={() => handleDelete(conversation)}
                />
                <Action
                  title="刷新列表"
                  icon={Icon.ArrowClockwise}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                  onAction={loadConversations}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}

function ConversationDetail({ conversation }: { conversation: Conversation }) {
  const markdown = conversation.messages
    .map((msg) => {
      const role = msg.role === "user" ? "👤 You" : "🤖 AI";
      const time = new Date(msg.timestamp).toLocaleString("zh-CN");
      return `### ${role} _${time}_\n\n${msg.content}\n\n---\n`;
    })
    .join("\n");

  return (
    <List>
      <List.Item
        title={conversation.title}
        detail={<List.Item.Detail markdown={markdown} />}
        actions={
          <ActionPanel>
            <Action.CopyToClipboard
              title="复制全部内容"
              content={markdown}
              shortcut={{ modifiers: ["cmd"], key: "c" }}
            />
          </ActionPanel>
        }
      />
    </List>
  );
}
