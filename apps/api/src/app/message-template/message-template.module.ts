import { CustomModule } from "@/common/decorators";
import { MessageTemplateResolver } from "./resolvers/message-template.resolver";
import { TeamModule } from "../team/team.module";
import { MessageTemplateService } from "./services/message-template.service";

@CustomModule({
  imports: [TeamModule],
  resolvers: [MessageTemplateResolver],
  providers: [MessageTemplateService],
})
export class MessageTemplateModule {}
