import { CustomModule } from "@/common/decorators";
import { TeamModule } from "../team/team.module";
import { AiSdrAvatarResolver } from "./resolvers/ai-sdr-avatar.resolver";
import { AiSdrAvatarService } from "./services/ai-sdr-avatar.service";

@CustomModule({
  imports: [TeamModule],
  providers: [AiSdrAvatarService],
  resolvers: [AiSdrAvatarResolver],
})
export class SdrModule {}
