import { CustomModule } from "@/common/decorators";
import { TeamModule } from "../team/team.module";
import { InboxResolver } from "./resolvers/inbox.resolver";
import { SuppressionResolver } from "./resolvers/suppression.resolver";
import { InboxService } from "./services/inbox.service";
import { AgentExecutionService } from "./services/agent-execution.service";
import { SabrinaSdrService } from "./services/sabrina-sdr.service";

@CustomModule({
  imports: [TeamModule],
  resolvers: [InboxResolver, SuppressionResolver],
  providers: [InboxService, AgentExecutionService, SabrinaSdrService],
  exports: [InboxService, AgentExecutionService, SabrinaSdrService],
})
export class InboxModule {}
