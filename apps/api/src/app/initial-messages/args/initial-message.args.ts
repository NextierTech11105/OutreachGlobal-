import { PageInfoArgs } from "@/app/apollo/args/page-info.args";
import { BooleanField, IdField, StringField } from "@/app/apollo/decorators";
import { MaybeString } from "@/app/apollo/types/maybe.type";
import { BaseTeamArgs } from "@/app/team/args/team.args";
import { ArgsType, Field } from "@nestjs/graphql";
import { InitialMessageCategory, MessageTone } from "@nextier/common";
import {
  CreateInitialMessageInput,
  UpdateInitialMessageInput,
  CreateMessageVariantInput,
  AssignMessageToCampaignInput,
  UpdateSdrCampaignConfigInput,
} from "../inputs/initial-message.input";

@ArgsType()
export class InitialMessageConnectionArgs extends PageInfoArgs {
  @IdField()
  teamId: string;

  @StringField({ nullable: true })
  category?: InitialMessageCategory;

  @StringField({ nullable: true })
  tone?: MessageTone;

  @BooleanField({ nullable: true })
  isActive?: boolean;

  @IdField({ nullable: true })
  sdrId?: string;

  @StringField({ nullable: true })
  searchQuery?: MaybeString;
}

@ArgsType()
export class FindOneInitialMessageArgs extends BaseTeamArgs {
  @IdField()
  id: string;
}

@ArgsType()
export class CreateInitialMessageArgs extends BaseTeamArgs {
  @Field()
  input: CreateInitialMessageInput;
}

@ArgsType()
export class UpdateInitialMessageArgs extends BaseTeamArgs {
  @IdField()
  id: string;

  @Field()
  input: UpdateInitialMessageInput;
}

@ArgsType()
export class DeleteInitialMessageArgs extends BaseTeamArgs {
  @IdField()
  id: string;
}

@ArgsType()
export class CreateMessageVariantArgs extends BaseTeamArgs {
  @Field()
  input: CreateMessageVariantInput;
}

@ArgsType()
export class AssignMessageToCampaignArgs extends BaseTeamArgs {
  @Field()
  input: AssignMessageToCampaignInput;
}

@ArgsType()
export class RemoveMessageFromCampaignArgs extends BaseTeamArgs {
  @IdField()
  campaignId: string;

  @IdField()
  initialMessageId: string;
}

@ArgsType()
export class CampaignMessagesArgs extends BaseTeamArgs {
  @IdField()
  campaignId: string;
}

// SDR Config Args
@ArgsType()
export class SdrCampaignConfigArgs extends BaseTeamArgs {
  @IdField()
  sdrId: string;

  @IdField()
  campaignId: string;
}

@ArgsType()
export class UpdateSdrCampaignConfigArgs extends BaseTeamArgs {
  @IdField()
  sdrId: string;

  @IdField()
  campaignId: string;

  @Field()
  input: UpdateSdrCampaignConfigInput;
}

@ArgsType()
export class MessageCategoriesArgs extends BaseTeamArgs {}

@ArgsType()
export class TopPerformingMessagesArgs extends BaseTeamArgs {
  @StringField({ nullable: true })
  category?: InitialMessageCategory;
}
