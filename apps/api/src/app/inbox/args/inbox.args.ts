import { PageInfoArgs } from "@/app/apollo/args/page-info.args";
import { BooleanField, IdField, StringField } from "@/app/apollo/decorators";
import { MaybeString } from "@/app/apollo/types/maybe.type";
import { BaseTeamArgs } from "@/app/team/args/team.args";
import { ArgsType, Field, ID } from "@nestjs/graphql";
import { BucketType, InboxPriority, ResponseClassification, SuppressionType } from "@nextier/common";
import {
  ProcessInboxItemInput,
  MoveInboxItemInput,
  CreateSuppressionInput,
  UpdateInboxItemInput,
  CreateResponseBucketInput,
} from "../inputs/inbox.input";

@ArgsType()
export class InboxItemConnectionArgs extends PageInfoArgs {
  @IdField()
  teamId: string;

  @StringField({ nullable: true })
  bucket?: BucketType;

  @StringField({ nullable: true })
  priority?: InboxPriority;

  @StringField({ nullable: true })
  classification?: ResponseClassification;

  @BooleanField({ nullable: true })
  isProcessed?: boolean;

  @BooleanField({ nullable: true })
  isRead?: boolean;

  @BooleanField({ nullable: true })
  isStarred?: boolean;

  @StringField({ nullable: true })
  searchQuery?: MaybeString;

  @IdField({ nullable: true })
  leadId?: string;

  @IdField({ nullable: true })
  campaignId?: string;

  @IdField({ nullable: true })
  assignedSdrId?: string;
}

@ArgsType()
export class FindOneInboxItemArgs extends BaseTeamArgs {
  @IdField()
  id: string;
}

@ArgsType()
export class ProcessInboxItemArgs extends BaseTeamArgs {
  @IdField()
  id: string;

  @Field()
  input: ProcessInboxItemInput;
}

@ArgsType()
export class MoveInboxItemArgs extends BaseTeamArgs {
  @IdField()
  id: string;

  @Field()
  input: MoveInboxItemInput;
}

@ArgsType()
export class UpdateInboxItemArgs extends BaseTeamArgs {
  @IdField()
  id: string;

  @Field()
  input: UpdateInboxItemInput;
}

@ArgsType()
export class BulkMoveInboxItemsArgs extends BaseTeamArgs {
  @Field(() => [ID])
  itemIds: string[];

  @Field()
  input: MoveInboxItemInput;
}

// Suppression args
@ArgsType()
export class SuppressionConnectionArgs extends PageInfoArgs {
  @IdField()
  teamId: string;

  @StringField({ nullable: true })
  type?: SuppressionType;

  @StringField({ nullable: true })
  searchQuery?: MaybeString;
}

@ArgsType()
export class CreateSuppressionArgs extends BaseTeamArgs {
  @Field()
  input: CreateSuppressionInput;
}

@ArgsType()
export class RemoveSuppressionArgs extends BaseTeamArgs {
  @IdField()
  id: string;
}

// Response bucket args
@ArgsType()
export class ResponseBucketArgs extends BaseTeamArgs {}

@ArgsType()
export class CreateResponseBucketArgs extends BaseTeamArgs {
  @Field()
  input: CreateResponseBucketInput;
}

@ArgsType()
export class BucketStatsArgs extends BaseTeamArgs {}
