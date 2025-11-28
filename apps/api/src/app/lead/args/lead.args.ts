import { PageInfoArgs } from "@/app/apollo/args/page-info.args";
import {
  BooleanField,
  IdField,
  IntField,
  StringField,
} from "@/app/apollo/decorators";
import { MaybeString } from "@/app/apollo/types/maybe.type";
import { BaseTeamArgs } from "@/app/team/args/team.args";
import { ArgsType, Field, ID } from "@nestjs/graphql";
import {
  CreateLeadInput,
  CreateLeadPhoneNumberInput,
  UpdateLeadInput,
} from "../inputs/lead.input";
import { ImportBusinessListInput } from "../inputs/import-business-list.input";

@ArgsType()
export class LeadConnectionArgs extends PageInfoArgs {
  @IdField()
  teamId: string;

  @StringField({ nullable: true })
  searchQuery?: MaybeString;

  @BooleanField({ nullable: true })
  hasPhone?: boolean;

  @Field(() => [String], { nullable: true })
  tags?: string[];

  @Field({ nullable: true })
  noStatus?: boolean;
}

@ArgsType()
export class LeadsCountArgs extends BaseTeamArgs {
  @IntField({ nullable: true })
  minScore?: number;

  @IntField({ nullable: true })
  maxScore?: number;
}

@ArgsType()
export class FindManyLeadStatusesArgs extends BaseTeamArgs {}

@ArgsType()
export class FindOneLeadArgs extends BaseTeamArgs {
  @IdField()
  id: string;
}

@ArgsType()
export class CreateLeadArgs extends BaseTeamArgs {
  @Field()
  input: CreateLeadInput;
}

@ArgsType()
export class UpdateLeadArgs extends BaseTeamArgs {
  @IdField()
  id: string;

  @Field()
  input: UpdateLeadInput;
}

@ArgsType()
export class DeleteLeadArgs extends BaseTeamArgs {
  @IdField()
  id: string;
}

@ArgsType()
export class BulkDeleteLeadArgs extends BaseTeamArgs {
  @Field(() => [ID])
  leadIds: string[];
}

@ArgsType()
export class CreateLeadPhoneNumberArgs extends BaseTeamArgs {
  @IdField()
  leadId: string;

  @Field()
  input: CreateLeadPhoneNumberInput;
}

@ArgsType()
export class UpdateLeadPhoneNumberArgs extends BaseTeamArgs {
  @IdField()
  leadId: string;

  @IdField()
  leadPhoneNumberId: string;

  @Field()
  label: string;
}

@ArgsType()
export class DeleteLeadPhoneNumberArgs extends BaseTeamArgs {
  @IdField()
  leadId: string;

  @IdField()
  leadPhoneNumberId: string;
}

@ArgsType()
export class UpdateLeadPositionArgs extends BaseTeamArgs {
  @IdField()
  id: string;

  @IntField()
  oldPosition: number;

  @IntField()
  newPosition: number;

  @Field()
  status: string;
}

@ArgsType()
export class ImportLeadFromBusienssArgs extends BaseTeamArgs {
  @IdField({ nullable: true })
  presetId?: string;

  @Field()
  input: ImportBusinessListInput;
}
