import { PageInfoArgs } from "@/app/apollo/args/page-info.args";
import { IdField, StringField, BooleanField } from "@/app/apollo/decorators";
import { MaybeString } from "@/app/apollo/types/maybe.type";
import { BaseTeamArgs } from "@/app/team/args/team.args";
import { ArgsType, Field } from "@nestjs/graphql";
import {
  CreateContentCategoryInput,
  UpdateContentCategoryInput,
} from "../inputs/content-category.input";

@ArgsType()
export class ContentCategoriesArgs {
  @IdField({ nullable: true })
  teamId?: MaybeString;

  @IdField({ nullable: true })
  parentId?: MaybeString;

  @BooleanField({ nullable: true })
  includeSystem?: boolean;
}

@ArgsType()
export class FindOneContentCategoryArgs {
  @IdField()
  id: string;
}

@ArgsType()
export class CreateContentCategoryArgs extends BaseTeamArgs {
  @Field()
  input: CreateContentCategoryInput;
}

@ArgsType()
export class UpdateContentCategoryArgs {
  @IdField()
  id: string;

  @Field()
  input: UpdateContentCategoryInput;
}

@ArgsType()
export class DeleteContentCategoryArgs {
  @IdField()
  id: string;
}
