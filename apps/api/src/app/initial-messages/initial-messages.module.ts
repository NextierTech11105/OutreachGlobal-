import { CustomModule } from "@/common/decorators";
import { TeamModule } from "../team/team.module";
import { InitialMessageResolver } from "./resolvers/initial-message.resolver";
import { InitialMessageService } from "./services/initial-message.service";

@CustomModule({
  imports: [TeamModule],
  resolvers: [InitialMessageResolver],
  providers: [InitialMessageService],
  exports: [InitialMessageService],
})
export class InitialMessagesModule {}
