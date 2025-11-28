import { PageInfoArgs } from "@/app/apollo/args/page-info.args";
import { IdField, StringField } from "@/app/apollo/decorators";
import { BaseTeamArgs } from "@/app/team/args/team.args";
import { ArgsType, Field } from "@nestjs/graphql";
import {
  CreateCampaignInput,
  UpdateCampaignInput,
} from "../inputs/campaign.input";

@ArgsType()
export class CampaignConnectionArgs extends PageInfoArgs {
  @IdField()
  teamId: string;

  @StringField({ nullable: true })
  status?: string;

  @StringField({ nullable: true })
  searchQuery?: string;
}

@ArgsType()
export class FindOneCampaignArgs extends BaseTeamArgs {
  @IdField()
  id: string;
}

@ArgsType()
export class CreateCampaignArgs extends BaseTeamArgs {
  @Field(() => CreateCampaignInput)
  input: CreateCampaignInput;
}

@ArgsType()
export class UpdateCampaignArgs extends BaseTeamArgs {
  @IdField()
  id: string;

  @Field(() => UpdateCampaignInput)
  input: UpdateCampaignInput;
}

@ArgsType()
export class DeleteCampaignArgs extends BaseTeamArgs {
  @IdField()
  id: string;
}

@ArgsType()
export class ToggleCampaignStatusArgs extends BaseTeamArgs {
  @IdField()
  id: string;
}
