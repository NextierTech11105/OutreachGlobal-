/**
 * AI Co-Pilot Module
 * Generates context-aware response suggestions for inbound messages
 * Includes auto-respond with rebuttals and calendar booking
 */

import { CustomModule } from "@/common/decorators";
import { ConfigModule } from "@nestjs/config";
import { TeamModule } from "@/app/team/team.module";
import { AiOrchestratorModule } from "@/app/ai-orchestrator/ai-orchestrator.module";
import { SignalHouseModule } from "@/lib/signalhouse/signalhouse.module";
import { ResponseGeneratorService } from "./services/response-generator.service";
import { AutoRespondService } from "./services/auto-respond.service";
import { CoPilotResolver } from "./resolvers/co-pilot.resolver";
import { AiCoPilotController } from "./ai-co-pilot.controller";

@CustomModule({
  imports: [ConfigModule, TeamModule, AiOrchestratorModule, SignalHouseModule],
  controllers: [AiCoPilotController],
  resolvers: [CoPilotResolver],
  providers: [ResponseGeneratorService, AutoRespondService],
  exports: [ResponseGeneratorService, AutoRespondService],
})
export class AiCoPilotModule {}
