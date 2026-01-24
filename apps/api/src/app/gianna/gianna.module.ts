import { CustomModule } from "@/common/decorators";
import { TeamModule } from "../team/team.module";
import { InboxModule } from "../inbox/inbox.module";
import { AiOrchestratorModule } from "../ai-orchestrator/ai-orchestrator.module";
import { GiannaService } from "./gianna.service";
import { GiannaController } from "./gianna.controller";
import { BullModule } from "@nestjs/bullmq";
import { ConfigModule } from "@nestjs/config";

export const GIANNA_QUEUE = "gianna";

@CustomModule({
  imports: [
    TeamModule,
    InboxModule,
    AiOrchestratorModule,
    ConfigModule,
    BullModule.registerQueue({
      name: GIANNA_QUEUE,
    }),
  ],
  providers: [GiannaService],
  controllers: [GiannaController],
  exports: [GiannaService],
})
export class GiannaModule {}
