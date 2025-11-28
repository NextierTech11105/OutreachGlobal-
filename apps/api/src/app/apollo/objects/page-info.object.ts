import { Field, ObjectType } from "@nestjs/graphql";
import { StringField } from "../decorators";

@ObjectType()
export class PageInfo {
  @StringField({ nullable: true })
  startCursor: string | null;

  @StringField({ nullable: true })
  endCursor?: string | null;

  @Field({ defaultValue: false })
  hasNextPage: boolean;

  @Field({ defaultValue: false })
  hasPrevPage: boolean;

  @Field({ defaultValue: 0 })
  total: number;

  @Field({ defaultValue: 0 })
  totalPerPage: number;
}
