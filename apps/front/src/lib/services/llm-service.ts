import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";

type LlmProvider = "openai" | "anthropic" | "google" | "grok" | "langchain";

type LlmSettings = {
  provider: LlmProvider;
  model: string;
  temperature?: number;
  maxTokens?: number;
};

// LangChain Configuration
const LANGCHAIN_CONFIG = {
  baseUrl: process.env.LANGCHAIN_URL || "https://ai.ownyourcrm.io",
  token: process.env.LANGCHAIN_TOKEN || "6f05931d-7a4a-4f9f-ab3e-8b87cef6a7de",
  defaultChain: "gianna-sdr", // Default chain for Gianna AI SDR
};

export class LlmService {
  private static instance: LlmService;
  private defaultProvider: LlmProvider = "openai";
  private defaultModels: Record<LlmProvider, string> = {
    openai: "gpt-4o",
    anthropic: "claude-3-opus",
    google: "gemini-1.5-pro",
    grok: "grok-2",
    langchain: "gianna-sdr",
  };

  private constructor() {}

  public static getInstance(): LlmService {
    if (!LlmService.instance) {
      LlmService.instance = new LlmService();
    }
    return LlmService.instance;
  }

  public async generateContent(
    prompt: string,
    settings: Partial<LlmSettings> = {},
  ): Promise<{ content: string; provider: LlmProvider; model: string }> {
    const provider = settings.provider || this.defaultProvider;
    const model = settings.model || this.defaultModels[provider];
    const temperature = settings.temperature || 0.7;
    const maxTokens = settings.maxTokens || 1000;

    try {
      let result: { text: string };

      switch (provider) {
        case "openai":
          result = await generateText({
            model: openai(model),
            prompt,
            temperature,
            maxTokens,
          });
          break;
        case "anthropic":
          result = await generateText({
            model: anthropic(model),
            prompt,
            temperature,
            maxTokens,
          });
          break;
        case "google":
          result = await generateText({
            model: google(model),
            prompt,
            temperature,
            maxTokens,
          });
          break;
        case "langchain":
          // Use LangChain/LangServe endpoint
          result = await this.callLangChain(prompt, model, temperature);
          break;
        case "grok":
        default:
          // Fallback to OpenAI
          result = await generateText({
            model: openai(this.defaultModels.openai),
            prompt,
            temperature,
            maxTokens,
          });
          break;
      }

      return {
        content: result.text,
        provider,
        model,
      };
    } catch (error) {
      console.error("Error generating content with LLM:", error);
      throw error;
    }
  }

  /**
   * Call LangChain/LangServe endpoint
   * Supports custom chains for Gianna AI SDR
   */
  private async callLangChain(
    prompt: string,
    chain: string = LANGCHAIN_CONFIG.defaultChain,
    temperature: number = 0.7
  ): Promise<{ text: string }> {
    try {
      const response = await fetch(`${LANGCHAIN_CONFIG.baseUrl}/invoke`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${LANGCHAIN_CONFIG.token}`,
          "X-API-Key": LANGCHAIN_CONFIG.token,
        },
        body: JSON.stringify({
          input: {
            prompt,
            chain,
            temperature,
          },
          config: {
            configurable: {
              chain_type: chain,
            },
          },
        }),
      });

      if (!response.ok) {
        console.warn(`LangChain returned ${response.status}, falling back to OpenAI`);
        // Fallback to OpenAI if LangChain fails
        const fallback = await generateText({
          model: openai(this.defaultModels.openai),
          prompt,
          temperature,
        });
        return { text: fallback.text };
      }

      const data = await response.json();
      return { text: data.output || data.response || data.text || "" };
    } catch (error) {
      console.error("LangChain error, falling back to OpenAI:", error);
      // Fallback to OpenAI
      const fallback = await generateText({
        model: openai(this.defaultModels.openai),
        prompt,
        temperature,
      });
      return { text: fallback.text };
    }
  }

  /**
   * Call a specific LangChain chain by name
   */
  public async callChain(
    chainName: string,
    input: Record<string, unknown>,
    config?: Record<string, unknown>
  ): Promise<unknown> {
    try {
      const response = await fetch(`${LANGCHAIN_CONFIG.baseUrl}/${chainName}/invoke`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${LANGCHAIN_CONFIG.token}`,
          "X-API-Key": LANGCHAIN_CONFIG.token,
        },
        body: JSON.stringify({
          input,
          config: config || {},
        }),
      });

      if (!response.ok) {
        throw new Error(`LangChain chain ${chainName} failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Error calling LangChain chain ${chainName}:`, error);
      throw error;
    }
  }

  /**
   * Stream from LangChain endpoint
   */
  public async streamChain(
    chainName: string,
    input: Record<string, unknown>,
    onChunk: (chunk: string) => void
  ): Promise<void> {
    const response = await fetch(`${LANGCHAIN_CONFIG.baseUrl}/${chainName}/stream`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${LANGCHAIN_CONFIG.token}`,
        "X-API-Key": LANGCHAIN_CONFIG.token,
      },
      body: JSON.stringify({ input }),
    });

    if (!response.ok || !response.body) {
      throw new Error(`LangChain stream failed: ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value);
      onChunk(chunk);
    }
  }

  public setDefaultProvider(provider: LlmProvider): void {
    this.defaultProvider = provider;
  }

  public setDefaultModel(provider: LlmProvider, model: string): void {
    this.defaultModels[provider] = model;
  }

  public getLangChainConfig() {
    return {
      baseUrl: LANGCHAIN_CONFIG.baseUrl,
      hasToken: !!LANGCHAIN_CONFIG.token,
      defaultChain: LANGCHAIN_CONFIG.defaultChain,
    };
  }
}

export const llmService = LlmService.getInstance();

// Export LangChain config for use in other services
export { LANGCHAIN_CONFIG };
