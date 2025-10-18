import { Field, ObjectType } from "@nestjs/graphql";
import { IntegrationField } from "../models/integration-field.model";

@ObjectType()
export class UpsertIntegrationFieldPayload {
  @Field(() => [IntegrationField])
  fields: IntegrationField[];
}
