import { PageInfoArgs } from "@/app/apollo/args/page-info.args";
import { BooleanField, IdField } from "@/app/apollo/decorators";
import { Maybe } from "@/app/apollo/types/maybe.type";
import { BaseTeamArgs } from "@/app/team/args/team.args";
import { ArgsType, Field } from "@nestjs/graphql";
import {
  CreateWorkflowInput,
  UpdateWorkflowInput,
} from "../inputs/workflow.input";

@ArgsType()
export class WorkflowConnectionArgs extends PageInfoArgs {
  @IdField()
  teamId: string;

  @BooleanField({ nullable: true })
  active?: Maybe<boolean>;
}

@ArgsType()
export class CreateWorkflowArgs extends BaseTeamArgs {
  @Field()
  input: CreateWorkflowInput;
}

@ArgsType()
export class UpdateWorkflowArgs extends BaseTeamArgs {
  @IdField()
  id: string;

  @Field()
  input: UpdateWorkflowInput;
}
