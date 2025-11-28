import { Field, InputType } from "@nestjs/graphql";
import { TeamMemberRole } from "@nextier/common";
import { CreateTeamAccountDto, InviteTeamMemberDto } from "@nextier/dto";

@InputType()
export class InviteTeamMemberInput implements InviteTeamMemberDto {
  @Field(() => String)
  email: string;

  @Field(() => String)
  role: TeamMemberRole;
}

@InputType()
export class CreateTeamAccountInput implements CreateTeamAccountDto {
  @Field()
  name: string;

  @Field()
  password: string;
}
