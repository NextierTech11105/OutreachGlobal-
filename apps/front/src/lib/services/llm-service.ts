import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";
import { googleGenerativeAi } from "@ai-sdk/google";

type LlmProvider = "openai" | "anthropic" | "google" | "grok" | "langchain";

type LlmSettings = {
  provider: LlmProvider;
  model: string;
  temperature?: number;
  maxTokens?: number;
};

export class LlmService {
  private static instance: LlmService;
  private defaultProvider: LlmProvider = "openai";
  private defaultModels: Record<LlmProvider, string> = {
    openai: "gpt-4o",
    anthropic: "claude-3-opus",
    google: "gemini-1.5-pro",
    grok: "grok-2",
    langchain: "langchain-orchestration",
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
            model: googleGenerativeAi(model),
            prompt,
            temperature,
            maxTokens,
          });
          break;
        case "grok":
        case "langchain":
        default:
          // Fallback to OpenAI for now
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

  public setDefaultProvider(provider: LlmProvider): void {
    this.defaultProvider = provider;
  }

  public setDefaultModel(provider: LlmProvider, model: string): void {
    this.defaultModels[provider] = model;
  }
}

export const llmService = LlmService.getInstance();
