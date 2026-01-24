/**
 * Copilot Module
 * Conversational AI for lead enrichment with function calling
 */

import { CustomModule } from "@/common/decorators";
import { ConfigModule } from "@nestjs/config";
import { LuciModule } from "@/app/luci/luci.module";
import { RawDataLakeModule } from "@/app/raw-data-lake/raw-data-lake.module";
import { CopilotController } from "./copilot.controller";
import { CopilotService } from "./copilot.service";
import { ToolRegistry } from "./tools/tool.registry";
import { CopilotJobService } from "./jobs/copilot-job.service";

@CustomModule({
  imports: [ConfigModule, LuciModule, RawDataLakeModule],
  controllers: [CopilotController],
  providers: [CopilotService, ToolRegistry, CopilotJobService],
  exports: [CopilotService],
})
export class CopilotModule {}
