import { ArgsType, Field } from "@nestjs/graphql";
import {
  CreateAiSdrAvatarInput,
  UpdateAiSdrAvatarInput,
} from "../inputs/sdr.input";
import { PageInfoArgs } from "@/app/apollo/args/page-info.args";
import { BaseTeamArgs } from "@/app/team/args/team.args";
import { IdField, StringField } from "@/app/apollo/decorators";
import { MaybeString } from "@/app/apollo/types/maybe.type";

@ArgsType()
export class AiSdrAvatarConnectionArgs extends PageInfoArgs {
  @IdField()
  teamId: string;

  @StringField({ nullable: true })
  searchQuery?: MaybeString;
}

@ArgsType()
export class FindAiSdrAvatarArgs extends BaseTeamArgs {
  @IdField()
  id: string;
}

@ArgsType()
export class CreateAiSdrAvatarArgs extends BaseTeamArgs {
  @Field()
  input: CreateAiSdrAvatarInput;
}

@ArgsType()
export class UpdateAiSdrAvatarArgs extends BaseTeamArgs {
  @IdField()
  id: string;

  @Field()
  input: UpdateAiSdrAvatarInput;
}

@ArgsType()
export class DeleteAiSdrAvatarArgs extends BaseTeamArgs {
  @IdField()
  id: string;
}
