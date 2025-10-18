import { Field, ObjectType } from "@nestjs/graphql";
import { Campaign, CampaignSelect } from "../models/campaign.model";
import { IdField } from "@/app/apollo/decorators";

@ObjectType()
export class CreateCampaignPayload {
  @Field(() => Campaign)
  campaign: CampaignSelect;
}

@ObjectType()
export class UpdateCampaignPayload {
  @Field(() => Campaign)
  campaign: CampaignSelect;
}

@ObjectType()
export class DeleteCampaignPayload {
  @IdField()
  deletedCampaignId: string;
}

@ObjectType()
export class ToggleCampaignStatusPayload {
  @Field(() => Campaign)
  campaign: CampaignSelect;
}
