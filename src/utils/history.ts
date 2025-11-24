import { join } from "path";
import { promises as fs } from "fs";
import { environment } from "@raycast/api";

export interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
  botName: string;
}

const HISTORY_DIR = join(environment.supportPath, "conversations");

export async function ensureHistoryDir(): Promise<void> {
  try {
    await fs.mkdir(HISTORY_DIR, { recursive: true });
  } catch (error) {
    console.error("Failed to create history directory:", error);
  }
}

export async function saveConversation(conversation: Conversation): Promise<void> {
  await ensureHistoryDir();
  const filePath = join(HISTORY_DIR, `${conversation.id}.json`);
  await fs.writeFile(filePath, JSON.stringify(conversation, null, 2), "utf-8");
}

export async function loadConversation(id: string): Promise<Conversation | null> {
  try {
    const filePath = join(HISTORY_DIR, `${id}.json`);
    const data = await fs.readFile(filePath, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Failed to load conversation:", error);
    return null;
  }
}

export async function listConversations(): Promise<Conversation[]> {
  await ensureHistoryDir();
  try {
    const files = await fs.readdir(HISTORY_DIR);
    const conversations: Conversation[] = [];

    for (const file of files) {
      if (file.endsWith(".json")) {
        try {
          const data = await fs.readFile(join(HISTORY_DIR, file), "utf-8");
          conversations.push(JSON.parse(data));
        } catch (error) {
          console.error(`Failed to read conversation file ${file}:`, error);
        }
      }
    }

    // Sort by updatedAt, newest first
    return conversations.sort((a, b) => b.updatedAt - a.updatedAt);
  } catch (error) {
    console.error("Failed to list conversations:", error);
    return [];
  }
}

export async function deleteConversation(id: string): Promise<void> {
  try {
    const filePath = join(HISTORY_DIR, `${id}.json`);
    await fs.unlink(filePath);
  } catch (error) {
    console.error("Failed to delete conversation:", error);
    throw error;
  }
}

export function generateConversationId(): string {
  return `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function generateConversationTitle(firstMessage: string): string {
  // Use first 50 characters of the first message as title
  const title = firstMessage.slice(0, 50);
  return title.length < firstMessage.length ? `${title}...` : title;
}
