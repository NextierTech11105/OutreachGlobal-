import { ObjectType, Field, Int } from "@nestjs/graphql";
import { InitialMessage, InitialMessageSelect } from "../models/initial-message.model";
import { CampaignInitialMessage, CampaignInitialMessageSelect } from "../models/campaign-initial-message.model";
import { SdrCampaignConfig, SdrCampaignConfigSelect } from "../models/sdr-campaign-config.model";
import { StringField, IntField } from "@/app/apollo/decorators";

@ObjectType()
export class CreateInitialMessagePayload {
  @Field(() => InitialMessage)
  initialMessage: InitialMessageSelect;
}

@ObjectType()
export class UpdateInitialMessagePayload {
  @Field(() => InitialMessage)
  initialMessage: InitialMessageSelect;
}

@ObjectType()
export class DeleteInitialMessagePayload {
  @StringField()
  deletedInitialMessageId: string;
}

@ObjectType()
export class AssignMessageToCampaignPayload {
  @Field(() => CampaignInitialMessage)
  assignment: CampaignInitialMessageSelect;
}

@ObjectType()
export class RemoveMessageFromCampaignPayload {
  @StringField()
  removedAssignmentId: string;
}

@ObjectType()
export class UpdateSdrCampaignConfigPayload {
  @Field(() => SdrCampaignConfig)
  config: SdrCampaignConfigSelect;
}

@ObjectType()
export class MessageCategoryStats {
  @StringField()
  category: string;

  @IntField()
  count: number;

  @IntField()
  activeCount: number;

  @IntField()
  avgResponseRate: number;
}

@ObjectType()
export class MessagePerformance {
  @StringField()
  messageId: string;

  @StringField()
  messageName: string;

  @IntField()
  timesUsed: number;

  @IntField()
  responseRate: number;

  @IntField()
  positiveResponseRate: number;

  @IntField({ nullable: true })
  avgResponseTime?: number;
}

@ObjectType()
export class PersonalizationToken {
  @StringField()
  token: string;

  @StringField()
  description: string;

  @StringField()
  example: string;
}

@ObjectType()
export class MessagePreview {
  @StringField()
  originalContent: string;

  @StringField()
  personalizedContent: string;

  @Field(() => [String])
  tokensUsed: string[];
}
