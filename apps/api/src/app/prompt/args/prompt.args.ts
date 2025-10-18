import { PageInfoArgs } from "@/app/apollo/args/page-info.args";
import { IdField, StringField } from "@/app/apollo/decorators";
import { MaybeString } from "@/app/apollo/types/maybe.type";
import { BaseTeamArgs } from "@/app/team/args/team.args";
import { ArgsType, Field, ID } from "@nestjs/graphql";
import { CreatePromptInput, UpdatePromptInput } from "../inputs/prompt.input";
import { PromptType } from "@nextier/common";

@ArgsType()
export class PromptConnectionArgs extends PageInfoArgs {
  @IdField()
  teamId: string;

  @StringField({ nullable: true })
  searchQuery?: MaybeString;

  @StringField({ nullable: true })
  type?: PromptType;
}

@ArgsType()
export class FindManyPromptsArgs extends BaseTeamArgs {}

@ArgsType()
export class FindOnePromptArgs extends BaseTeamArgs {
  @IdField()
  id: string;
}

@ArgsType()
export class CreatePromptArgs extends BaseTeamArgs {
  @Field()
  input: CreatePromptInput;
}

@ArgsType()
export class UpdatePromptArgs extends BaseTeamArgs {
  @IdField()
  id: string;

  @Field()
  input: UpdatePromptInput;
}

@ArgsType()
export class DeletePromptArgs extends BaseTeamArgs {
  @IdField()
  id: string;
}

@ArgsType()
export class BulkDeletePromptArgs extends BaseTeamArgs {
  @Field(() => [ID])
  promptIds: string[];
}
