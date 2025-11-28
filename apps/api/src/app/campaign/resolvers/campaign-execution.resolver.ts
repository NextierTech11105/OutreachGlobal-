import { Resolver } from "@nestjs/graphql";
import { CampaignExecution } from "../models/campaign-execution.model";
import { UseAuthGuard } from "@/app/auth/decorators";
import { BaseResolver } from "@/app/apollo/base.resolver";

@Resolver(() => CampaignExecution)
@UseAuthGuard()
export class CampaignExecutionResolver extends BaseResolver(
  CampaignExecution,
) {}
