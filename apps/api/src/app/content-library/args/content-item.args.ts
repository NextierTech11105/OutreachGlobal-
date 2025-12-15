import { PageInfoArgs } from "@/app/apollo/args/page-info.args";
import { IdField, StringField, BooleanField } from "@/app/apollo/decorators";
import { MaybeString } from "@/app/apollo/types/maybe.type";
import { BaseTeamArgs } from "@/app/team/args/team.args";
import { ArgsType, Field, registerEnumType } from "@nestjs/graphql";
import { ContentItemType, ContentUsedIn, ContentVisibility } from "@nextier/common";
import {
  CreateContentItemInput,
  UpdateContentItemInput,
} from "../inputs/content-item.input";

// Register enums for GraphQL
registerEnumType(ContentItemType, { name: "ContentItemType" });
registerEnumType(ContentUsedIn, { name: "ContentUsedIn" });
registerEnumType(ContentVisibility, { name: "ContentVisibility" });

@ArgsType()
export class ContentItemConnectionArgs extends PageInfoArgs {
  @IdField()
  teamId: string;

  @IdField({ nullable: true })
  categoryId?: MaybeString;

  @Field(() => ContentItemType, { nullable: true })
  contentType?: ContentItemType;

  @StringField({ nullable: true })
  searchQuery?: MaybeString;

  @Field(() => [String], { nullable: true })
  tags?: string[];

  @BooleanField({ nullable: true })
  isActive?: boolean;

  @BooleanField({ nullable: true })
  favoritesOnly?: boolean;
}

@ArgsType()
export class FindOneContentItemArgs {
  @IdField()
  id: string;
}

@ArgsType()
export class CreateContentItemArgs extends BaseTeamArgs {
  @Field()
  input: CreateContentItemInput;
}

@ArgsType()
export class UpdateContentItemArgs {
  @IdField()
  id: string;

  @Field()
  input: UpdateContentItemInput;
}

@ArgsType()
export class DeleteContentItemArgs {
  @IdField()
  id: string;
}

@ArgsType()
export class UseContentItemArgs extends BaseTeamArgs {
  @IdField()
  id: string;

  @Field(() => ContentUsedIn)
  usedIn: ContentUsedIn;
}

@ArgsType()
export class DuplicateContentItemArgs extends BaseTeamArgs {
  @IdField()
  id: string;
}

@ArgsType()
export class ToggleFavoriteArgs {
  @IdField()
  id: string;
}
