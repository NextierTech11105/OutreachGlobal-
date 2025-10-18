import { Context, Parent, ResolveField, Resolver } from "@nestjs/graphql";
import { CampaignLead } from "../models/campaign-lead.model";
import { UseAuthGuard } from "@/app/auth/decorators";
import { BaseResolver } from "@/app/apollo/base.resolver";
import { Lead } from "@/app/lead/models/lead.model";
import { Dataloaders } from "@/app/apollo/types/dataloader.type";

@Resolver(() => CampaignLead)
@UseAuthGuard()
export class CampaignLeadResolver extends BaseResolver(CampaignLead) {
  constructor() {
    super();
  }

  @ResolveField(() => Lead)
  lead(
    @Parent() campaignLead: CampaignLead,
    @Context("loaders") loaders: Dataloaders,
  ) {
    return loaders.lead.load(campaignLead.leadId);
  }
}
