import { Field, ObjectType } from "@nestjs/graphql";
import {
  IntegrationTask,
  IntegrationTaskSelect,
} from "../models/integration-task.model";

@ObjectType()
export class ConnectIntegrationPayload {
  @Field()
  uri: string;

  @Field()
  method: string;
}

@ObjectType()
export class SyncIntegrationLeadPayload {
  @Field(() => IntegrationTask)
  task: IntegrationTaskSelect;
}
