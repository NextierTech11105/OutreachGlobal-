import { CustomModule } from "@/common/decorators";
import { TeamModule } from "../team/team.module";
import { InboxModule } from "../inbox/inbox.module";
import { AiOrchestratorModule } from "../ai-orchestrator/ai-orchestrator.module";
import { SignalHouseModule } from "@/lib/signalhouse/signalhouse.module";
import { GiannaService } from "./gianna.service";
import { GiannaController } from "./gianna.controller";
import { GiannaConsumer } from "./gianna.consumer";
import { BullModule } from "@nestjs/bullmq";
import { ConfigModule } from "@nestjs/config";
import { GIANNA_QUEUE } from "./gianna.constants";

@CustomModule({
  imports: [
    TeamModule,
    InboxModule,
    AiOrchestratorModule,
    SignalHouseModule,
    ConfigModule,
    BullModule.registerQueue({
      name: GIANNA_QUEUE,
    }),
  ],
  providers: [GiannaService, GiannaConsumer],
  controllers: [GiannaController],
  exports: [GiannaService],
})
export class GiannaModule {}
