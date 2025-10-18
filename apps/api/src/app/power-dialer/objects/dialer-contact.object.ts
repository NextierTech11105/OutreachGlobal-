import { Field, ObjectType } from "@nestjs/graphql";

@ObjectType()
export class UpsertDialerContactsPayload {
  @Field()
  newLeadsCount: number;
}
