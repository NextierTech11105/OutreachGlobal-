/**
 * AI Orchestrator Module
 * Central hub for all AI operations in NEXTIER
 */

import { CustomModule } from "@/common/decorators";
import { CircuitBreakerModule } from "@/lib/circuit-breaker";
import { BullModule } from "@nestjs/bullmq";
import { ConfigModule } from "@nestjs/config";

// Constants
import { AI_QUEUE } from "./constants/ai-queue.constants";

// Providers
import { OpenAIClient } from "./providers/openai.client";
import { AnthropicClient } from "./providers/anthropic.client";
import { PerplexityClient } from "./providers/perplexity.client";

// Services
import { UsageMeterService } from "./usage/usage-meter.service";
import { AiOrchestratorService } from "./ai-orchestrator.service";
import { AiQueueService } from "./services/ai-queue.service";

// Consumer
import { AiConsumer } from "./consumers/ai.consumer";

// Controller
import { AiOrchestratorController } from "./ai-orchestrator.controller";

@CustomModule({
  imports: [
    ConfigModule,
    CircuitBreakerModule,
    BullModule.registerQueue({
      name: AI_QUEUE,
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 50,
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 5000,
        },
      },
    }),
  ],
  controllers: [AiOrchestratorController],
  providers: [
    // Provider clients
    OpenAIClient,
    AnthropicClient,
    PerplexityClient,
    // Services
    UsageMeterService,
    AiOrchestratorService,
    AiQueueService,
  ],
  consumers: [AiConsumer],
  exports: [
    AiOrchestratorService,
    AiQueueService,
    UsageMeterService,
    OpenAIClient,
    AnthropicClient,
    PerplexityClient,
  ],
})
export class AiOrchestratorModule {}
