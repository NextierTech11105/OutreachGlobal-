import { CustomModule } from "@/common/decorators";
import { TeamModule } from "../team/team.module";
import { AiOrchestratorModule } from "../ai-orchestrator/ai-orchestrator.module";
import { NevaService } from "./neva.service";
import { NevaController } from "./neva.controller";
import { ConfigModule } from "@nestjs/config";
import { CacheModule } from "../../lib/cache/cache.module";

/**
 * NEVA MODULE - Research Copilot
 *
 * NEVA provides business intelligence and context for outreach:
 * - Uses Perplexity API for business research
 * - Provides personalization recommendations
 * - Recommends best worker (GIANNA/CATHY/SABRINA)
 * - Prepares discovery call questions
 *
 * NEVA is ADVISORY ONLY - never overrides LUCI compliance decisions.
 */
@CustomModule({
  imports: [TeamModule, AiOrchestratorModule, ConfigModule, CacheModule],
  providers: [NevaService],
  controllers: [NevaController],
  exports: [NevaService],
})
export class NevaModule {}
