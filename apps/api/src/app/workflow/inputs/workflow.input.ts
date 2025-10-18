import { StringField } from "@/app/apollo/decorators";
import { Field, InputType } from "@nestjs/graphql";
import { CreateWorkflowDto } from "@nextier/dto";

@InputType()
export class WorkflowActionInput {
  @Field()
  name: string;

  @StringField({ nullable: true })
  value?: string;
}

@InputType()
export class CreateWorkflowInput implements CreateWorkflowDto {
  @Field()
  name: string;

  @Field()
  trigger: string;

  @StringField({ nullable: true })
  description?: string;

  @Field()
  active: boolean;

  @Field()
  priority: number;

  @Field(() => [WorkflowActionInput])
  actions: WorkflowActionInput[];
}

@InputType()
export class UpdateWorkflowInput extends CreateWorkflowInput {}
