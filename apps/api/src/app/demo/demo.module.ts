import { CustomModule } from "@/common/decorators";
import { TeamModule } from "../team/team.module";
import { InboxModule } from "../inbox/inbox.module";
import { AiOrchestratorModule } from "../ai-orchestrator/ai-orchestrator.module";
import { GiannaModule } from "../gianna/gianna.module";
import { CathyModule } from "../cathy/cathy.module";
import { ConfigModule } from "@nestjs/config";
import { BullModule } from "@nestjs/bullmq";
import { DemoService } from "./demo.service";
import { DemoController } from "./demo.controller";
import { DemoConsumer } from "./demo.consumer";

export const DEMO_QUEUE = "demo-sms";

@CustomModule({
  imports: [
    TeamModule,
    InboxModule,
    AiOrchestratorModule,
    GiannaModule,
    CathyModule,
    ConfigModule,
    BullModule.registerQueue({
      name: DEMO_QUEUE,
    }),
  ],
  providers: [DemoService, DemoConsumer],
  controllers: [DemoController],
  exports: [DemoService],
})
export class DemoModule {}
