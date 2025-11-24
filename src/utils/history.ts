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

// In-memory cache for faster access
const conversationCache = new Map<string, { data: Conversation; timestamp: number }>();
const CACHE_TTL = 30000; // 30 seconds cache
let listCache: { conversations: Conversation[]; timestamp: number } | null = null;

export async function ensureHistoryDir(): Promise<void> {
  try {
    await fs.mkdir(HISTORY_DIR, { recursive: true });
  } catch (error) {
    console.error("Failed to create history directory:", error);
  }
}

// Debounce map for save operations
const saveTimers = new Map<string, NodeJS.Timeout>();

export async function saveConversation(conversation: Conversation): Promise<void> {
  // Update cache immediately for fast reads
  conversationCache.set(conversation.id, { data: conversation, timestamp: Date.now() });
  listCache = null; // Invalidate list cache
  
  // Debounce file writes to reduce disk I/O
  if (saveTimers.has(conversation.id)) {
    clearTimeout(saveTimers.get(conversation.id)!);
  }
  
  saveTimers.set(
    conversation.id,
    setTimeout(async () => {
      try {
        await ensureHistoryDir();
        const filePath = join(HISTORY_DIR, `${conversation.id}.json`);
        await fs.writeFile(filePath, JSON.stringify(conversation), "utf-8");
        saveTimers.delete(conversation.id);
      } catch (error) {
        console.error("Failed to save conversation:", error);
      }
    }, 500) // Delay 500ms before writing to disk
  );
}

export async function loadConversation(id: string): Promise<Conversation | null> {
  // Check cache first
  const cached = conversationCache.get(id);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  
  try {
    const filePath = join(HISTORY_DIR, `${id}.json`);
    const data = await fs.readFile(filePath, "utf-8");
    const conversation = JSON.parse(data);
    
    // Update cache
    conversationCache.set(id, { data: conversation, timestamp: Date.now() });
    
    return conversation;
  } catch (error) {
    console.error("Failed to load conversation:", error);
    return null;
  }
}

export async function listConversations(): Promise<Conversation[]> {
  // Check cache first
  if (listCache && Date.now() - listCache.timestamp < CACHE_TTL) {
    return listCache.conversations;
  }
  
  await ensureHistoryDir();
  try {
    const files = await fs.readdir(HISTORY_DIR);
    const jsonFiles = files.filter(file => file.endsWith(".json"));

    // Parallel read for better performance with concurrency limit
    const batchSize = 10;
    const conversations: Conversation[] = [];
    
    for (let i = 0; i < jsonFiles.length; i += batchSize) {
      const batch = jsonFiles.slice(i, i + batchSize);
      const results = await Promise.allSettled(
        batch.map(async (file) => {
          const id = file.replace(".json", "");
          // Check cache first
          const cached = conversationCache.get(id);
          if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
            return cached.data;
          }
          
          const data = await fs.readFile(join(HISTORY_DIR, file), "utf-8");
          const conv = JSON.parse(data) as Conversation;
          conversationCache.set(id, { data: conv, timestamp: Date.now() });
          return conv;
        })
      );
      
      conversations.push(
        ...results
          .filter((result): result is PromiseFulfilledResult<Conversation> => result.status === "fulfilled")
          .map((result) => result.value)
      );
    }

    // Sort by updatedAt, newest first (optimized comparison)
    conversations.sort((a, b) => b.updatedAt - a.updatedAt);
    
    // Update cache
    listCache = { conversations, timestamp: Date.now() };
    
    return conversations;
  } catch (error) {
    console.error("Failed to list conversations:", error);
    return [];
  }
}

export async function deleteConversation(id: string): Promise<void> {
  // Clear cache
  conversationCache.delete(id);
  listCache = null;
  
  // Cancel pending save
  if (saveTimers.has(id)) {
    clearTimeout(saveTimers.get(id)!);
    saveTimers.delete(id);
  }
  
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
