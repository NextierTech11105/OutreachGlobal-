import { CustomModule } from "@/common/decorators";
import { TeamModule } from "../team/team.module";
import { PromptResolver } from "./resolvers/prompt.resolver";
import { PromptService } from "./services/prompt.service";

@CustomModule({
  imports: [TeamModule],
  resolvers: [PromptResolver],
  providers: [PromptService],
  exports: [PromptService],
})
export class PromptModule {}
