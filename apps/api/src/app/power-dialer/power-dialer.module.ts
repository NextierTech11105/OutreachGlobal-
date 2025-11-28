import { CustomModule } from "@/common/decorators";
import { TeamModule } from "../team/team.module";
import { TwilioModule } from "@/lib/twilio/twilio.module";
import { VoiceController } from "./controllers/voice.controller";
import { PowerDialerResolver } from "./resolvers/power-dialer.resolver";
import { PowerDialerService } from "./services/power-dialer.service";
import { DialerContactResolver } from "./resolvers/dialer-contact.resolver";
import { CallHistoryResolver } from "./resolvers/call-history.resolver";
import { CallCenterReportResolver } from "./resolvers/call-center.resolver";

@CustomModule({
  imports: [TeamModule, TwilioModule],
  controllers: [VoiceController],
  resolvers: [
    PowerDialerResolver,
    DialerContactResolver,
    CallHistoryResolver,
    CallCenterReportResolver,
  ],
  providers: [PowerDialerService],
})
export class PowerDialerModule {}
