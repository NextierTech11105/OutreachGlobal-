import { CustomModule } from "@/common/decorators";
import { TeamModule } from "../team/team.module";
import { AiOrchestratorModule } from "../ai-orchestrator/ai-orchestrator.module";
import { InboxResolver } from "./resolvers/inbox.resolver";
import { SuppressionResolver } from "./resolvers/suppression.resolver";
import { InboxService } from "./services/inbox.service";
import { SabrinaSdrService } from "./services/sabrina-sdr.service";
import { AgentRouterService } from "./services/agent-router.service";

@CustomModule({
  imports: [TeamModule, AiOrchestratorModule],
  resolvers: [InboxResolver, SuppressionResolver],
  providers: [InboxService, SabrinaSdrService, AgentRouterService],
  exports: [InboxService, SabrinaSdrService, AgentRouterService],
})
export class InboxModule {}
