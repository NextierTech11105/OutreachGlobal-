import { CustomModule } from "@/common/decorators";
import { CampaignResolver } from "./resolvers/campaign.resolver";
import { TeamModule } from "../team/team.module";
import { CampaignService } from "./services/campaign.service";
import { CampaignRepository } from "./repositories/campaign.repository";
import { LeadModule } from "../lead/lead.module";
import { BullModule } from "@nestjs/bullmq";
import { CAMPAIGN_SEQUENCE_QUEUE } from "./constants/campaign-sequence.contants";
import { CampaignSchedule } from "./schedules/campaign.schedule";
import { CampaignSequenceConsumer } from "./consumers/campaign-sequence.consumer";
import { MailModule } from "@/lib/mail/mail.module";
import { TwilioModule } from "@/lib/twilio/twilio.module";
import { ConfigModule } from "@nestjs/config";
import { CampaignWebhookController } from "./controllers/campaign-webhook.controller";
import { CampaignSaga } from "./sagas/campaign.saga";
import { CAMPAIGN_QUEUE } from "./constants/campaign.contants";
import { SyncLeadCampaignHandler } from "./commands/handlers/sync-lead-campaign.handler";
import { CampaignConsumer } from "./consumers/campaign.consumer";
import { CampaignLeadResolver } from "./resolvers/campaign-lead.resolver";
import { CampaignExecutionResolver } from "./resolvers/campaign-execution.resolver";

@CustomModule({
  imports: [
    TeamModule,
    LeadModule,
    MailModule,
    TwilioModule,
    ConfigModule,
    BullModule.registerQueue({
      name: CAMPAIGN_SEQUENCE_QUEUE,
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 50,
      },
    }),
    BullModule.registerQueue({
      name: CAMPAIGN_QUEUE,
      defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: true,
      },
    }),
  ],
  resolvers: [
    CampaignResolver,
    CampaignLeadResolver,
    CampaignExecutionResolver,
  ],
  providers: [CampaignService],
  consumers: [CampaignSequenceConsumer, CampaignConsumer],
  repositories: [CampaignRepository],
  controllers: [CampaignWebhookController],
  sagas: [CampaignSaga],
  schedules: [CampaignSchedule],
  commands: [SyncLeadCampaignHandler],
})
export class CampaignModule {}
