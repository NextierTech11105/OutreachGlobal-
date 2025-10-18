import { CommandHandler, ICommandHandler } from "@nestjs/cqrs";
import { SyncLeadCampaign } from "../sync-lead-campaign";
import { InjectQueue } from "@nestjs/bullmq";
import {
  CAMPAIGN_QUEUE,
  CampaignJobs,
} from "../../constants/campaign.contants";
import { Queue } from "bullmq";

@CommandHandler(SyncLeadCampaign)
export class SyncLeadCampaignHandler
  implements ICommandHandler<SyncLeadCampaign>
{
  constructor(@InjectQueue(CAMPAIGN_QUEUE) private queue: Queue) {}

  async execute(command: SyncLeadCampaign) {
    await this.queue.add(CampaignJobs.SYNC_LEAD_CAMPAIGN, command);
  }
}
