import { CustomModule } from "@/common/decorators";
import { TeamService } from "./services/team.service";
import { TeamPolicy } from "./policies/team.policy";
import { TeamResolver } from "./resolvers/team.resolver";
import { CacheModule } from "../lib/cache/cache.module";
import { ConfigModule } from "@nestjs/config";
import { MailModule } from "@/lib/mail/mail.module";
import { TeamInvitationResolver } from "./resolvers/team-invitation.resolver";
import { TeamMemberResolver } from "./resolvers/team-member.resolver";
import { TeamMemberService } from "./services/team-member.service";
import { UserModule } from "../user/user.module";
import { SendgridSettingsResolver } from "./resolvers/sendgrid-settings.resolver";
import { TwilioSettingsResolver } from "./resolvers/twilio-settings.resolver";
import { TeamSettingService } from "./services/team-setting.service";
import { SendgridService } from "./services/sendgrid.service";
import { TwilioModule } from "@/lib/twilio/twilio.module";
import { TwilioPhoneResolver } from "./resolvers/twilio-phone.resolver";
import { BusinessListSettingsResolver } from "./resolvers/business-list-settings.resolver";

@CustomModule({
  imports: [CacheModule, ConfigModule, MailModule, UserModule, TwilioModule],
  providers: [
    TeamService,
    TeamMemberService,
    TeamSettingService,
    SendgridService,
  ],
  policies: [TeamPolicy],
  resolvers: [
    TeamResolver,
    TeamInvitationResolver,
    TeamMemberResolver,
    SendgridSettingsResolver,
    TwilioSettingsResolver,
    TwilioPhoneResolver,
    BusinessListSettingsResolver,
  ],
  exports: [TeamService, TeamPolicy, SendgridService, TeamSettingService],
})
export class TeamModule {}
