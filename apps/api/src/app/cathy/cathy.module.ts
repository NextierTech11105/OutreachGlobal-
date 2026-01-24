import { CustomModule } from "@/common/decorators";
import { TeamModule } from "../team/team.module";
import { InboxModule } from "../inbox/inbox.module";
import { AiOrchestratorModule } from "../ai-orchestrator/ai-orchestrator.module";
import { ConfigModule } from "@nestjs/config";
import { BullModule } from "@nestjs/bullmq";
import { CathyService } from "./cathy.service";
import { CathyController } from "./cathy.controller";

export const CATHY_QUEUE = "cathy";

@CustomModule({
  imports: [
    TeamModule,
    InboxModule,
    AiOrchestratorModule,
    ConfigModule,
    BullModule.registerQueue({
      name: CATHY_QUEUE,
    }),
  ],
  providers: [CathyService],
  controllers: [CathyController],
  exports: [CathyService],
})
export class CathyModule {}
