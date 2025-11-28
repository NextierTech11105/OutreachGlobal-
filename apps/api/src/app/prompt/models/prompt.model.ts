import { TimestampModel } from "@/app/apollo/base-model";
import { StringField } from "@/app/apollo/decorators";
import { WithConnection, WithEdge } from "@/app/apollo/graphql-relay";
import { Maybe } from "@/app/apollo/types/maybe.type";
import { promptsTable } from "@/database/schema-alias";
import { Field, ObjectType } from "@nestjs/graphql";
import { PromptCategory, PromptType } from "@nextier/common";

export type PromptSelect = typeof promptsTable.$inferSelect;
export type PromptInsert = typeof promptsTable.$inferInsert;

@ObjectType()
export class Prompt extends TimestampModel implements PromptSelect {
  teamId: string;

  @StringField()
  name: string;

  @Field(() => String)
  type: PromptType;

  @Field(() => String)
  category: PromptCategory;

  @StringField({ nullable: true })
  description: Maybe<string>;

  @StringField()
  content: string;

  @Field(() => [String], { nullable: true })
  tags: Maybe<string[]>;
}

@ObjectType()
export class PromptEdge extends WithEdge(Prompt) {}

@ObjectType()
export class PromptConnection extends WithConnection(PromptEdge) {}
