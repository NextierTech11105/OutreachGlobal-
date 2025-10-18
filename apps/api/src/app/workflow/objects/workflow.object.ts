import { Field, ObjectType } from "@nestjs/graphql";
import { Workflow, WorkflowSelect } from "../models/workflow.model";

@ObjectType({ isAbstract: true })
export class WorkflowPayload {
  @Field(() => Workflow)
  workflow: WorkflowSelect;
}

@ObjectType()
export class CreateWorkflowPayload extends WorkflowPayload {}
