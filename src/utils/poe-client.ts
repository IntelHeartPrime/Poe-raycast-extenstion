import OpenAI from "openai";
import { HttpsProxyAgent } from "https-proxy-agent";
import { Message } from "./history";
import fetch from "node-fetch";

export interface PoeClientConfig {
  apiKey: string;
  botName: string;
  proxyUrl?: string;
  refererUrl?: string;
  appTitle?: string;
}

function getProxyAgent(configProxyUrl?: string) {
  // 优先使用配置中的代理
  const proxyUrl = 
    configProxyUrl ||
    process.env.HTTPS_PROXY || 
    process.env.https_proxy || 
    process.env.HTTP_PROXY || 
    process.env.http_proxy ||
    process.env.ALL_PROXY ||
    process.env.all_proxy;

  if (proxyUrl) {
    console.log(`🔗 Using proxy: ${proxyUrl}`);
    return new HttpsProxyAgent(proxyUrl);
  }

  console.log(`⚠️  No proxy configured - this may cause timeout if you need VPN/proxy`);
  return undefined;
}

export class PoeClient {
  private client: OpenAI;
  private botName: string;
  private refererUrl?: string;
  private appTitle?: string;

  constructor(config: PoeClientConfig) {
    const headers: Record<string, string> = {};
    
    if (config.refererUrl) {
      headers["HTTP-Referer"] = config.refererUrl;
    }
    
    if (config.appTitle) {
      headers["X-Title"] = config.appTitle;
    }

    const httpAgent = getProxyAgent(config.proxyUrl);

    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: "https://api.poe.com/v1",
      defaultHeaders: headers,
      timeout: 60000, // 60 seconds timeout
      maxRetries: 0, // 禁用重试以便更快看到错误
      // 使用支持代理的 node-fetch
      // @ts-expect-error - fetch type mismatch but works
      fetch: (url: string, init: any) => {
        return fetch(url, {
          ...init,
          agent: httpAgent,
        });
      },
    });

    this.botName = config.botName;
    this.refererUrl = config.refererUrl;
    this.appTitle = config.appTitle;
  }

  async *streamChat(messages: Message[]): AsyncGenerator<string, void, unknown> {
    const formattedMessages = messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    try {
      console.log("📤 发送流式请求:");
      console.log("  Bot:", this.botName);
      console.log("  Messages:", formattedMessages.length);
      console.log("  Base URL:", "https://api.poe.com/v1");
      
      const stream = await this.client.chat.completions.create({
        model: this.botName,
        messages: formattedMessages,
        stream: true,
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          yield content;
        }
      }
    } catch (error: unknown) {
      const err = error as { code?: string; message?: string; status?: number };
      if (err.code === 'ETIMEDOUT' || err.message?.includes('timeout')) {
        throw new Error('请求超时，请检查网络连接或稍后重试');
      } else if (err.status === 401) {
        throw new Error('API Key 无效，请在设置中检查你的 Poe API Key');
      } else if (err.status === 429) {
        throw new Error('请求过于频繁，请稍后再试（每分钟限制 500 次请求）');
      } else if (err.status === 402) {
        throw new Error('积分不足，请访问 poe.com 充值');
      } else {
        throw new Error(err.message || '请求失败，请稍后重试');
      }
    }
  }

  async chat(messages: Message[]): Promise<string> {
    const formattedMessages = messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    try {
      console.log("📤 发送请求:");
      console.log("  Bot:", this.botName);
      console.log("  Messages:", formattedMessages.length);
      console.log("  Base URL:", "https://api.poe.com/v1");
      
      const completion = await this.client.chat.completions.create({
        model: this.botName,
        messages: formattedMessages,
      });

      return completion.choices[0]?.message?.content || "";
    } catch (error: unknown) {
      console.error("❌ 请求失败:", error);
      const err = error as { code?: string; message?: string; status?: number; cause?: unknown };
      
      if (err.cause) {
        console.error("❌ 错误原因:", err.cause);
      }
      
      if (err.code === 'ETIMEDOUT' || err.message?.includes('timeout')) {
        throw new Error(`请求超时 (${err.code || 'timeout'})，请检查：1) 代理是否运行 2) 网络连接`);
      } else if (err.status === 401) {
        throw new Error('API Key 无效，请在设置中检查你的 Poe API Key');
      } else if (err.status === 404) {
        throw new Error(`Bot '${this.botName}' 不存在，请检查 Bot 名称`);
      } else if (err.status === 429) {
        throw new Error('请求过于频繁，请稍后再试（每分钟限制 500 次请求）');
      } else if (err.status === 402) {
        throw new Error('积分不足，请访问 poe.com 充值');
      } else {
        throw new Error(`${err.message || '请求失败'} (status: ${err.status || 'unknown'})`);
      }
    }
  }
}
