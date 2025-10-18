import { Field, ObjectType } from "@nestjs/graphql";
import { IdField } from "../apollo/decorators";
import { WithConnection, WithEdge } from "../apollo/graphql-relay";

@ObjectType()
export class Resource {
  @IdField()
  id: string;

  @Field()
  label: string;
}

@ObjectType()
export class ResourceEdge extends WithEdge(Resource) {}

@ObjectType()
export class ResourceConnection extends WithConnection(ResourceEdge) {}
