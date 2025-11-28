import { CustomModule } from "@/common/decorators";
import { LeadModule } from "../lead/lead.module";
import { TwilioModule } from "@/lib/twilio/twilio.module";
import { MailModule } from "@/lib/mail/mail.module";
import { TeamModule } from "../team/team.module";
import { MessageService } from "./services/message.service";
import { MessageResolver } from "./resolvers/message.resolver";

@CustomModule({
  imports: [LeadModule, TwilioModule, MailModule, TeamModule],
  providers: [MessageService],
  resolvers: [MessageResolver],
})
export class MessageModule {}
