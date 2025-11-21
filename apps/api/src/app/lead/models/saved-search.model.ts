import { TimestampModel } from "@/app/apollo/base-model";
import { StringField } from "@/app/apollo/decorators";
import { WithConnection, WithEdge } from "@/app/apollo/graphql-relay";
import { MaybeString } from "@/app/apollo/types/maybe.type";
import { savedSearchesTable } from "@/database/schema-alias";
import { Field, ObjectType } from "@nestjs/graphql";
import GraphQLJSON from "graphql-type-json";

export type SavedSearchSelect = typeof savedSearchesTable.$inferSelect;
export type SavedSearchInsert = typeof savedSearchesTable.$inferInsert;

@ObjectType()
export class SavedSearch extends TimestampModel implements SavedSearchSelect {
  teamId: string;

  @StringField()
  searchName: string;

  @Field(() => GraphQLJSON)
  searchQuery: Record<string, any>;

  @StringField({ nullable: true })
  realEstateSearchId: MaybeString;

  @Field(() => Date, { nullable: true })
  lastReportDate: Date | null;

  @Field(() => Date, { nullable: true })
  nextReportDate: Date | null;

  @StringField({ nullable: true })
  totalProperties: MaybeString;

  @StringField({ nullable: true })
  addedCount: MaybeString;

  @StringField({ nullable: true })
  deletedCount: MaybeString;

  @StringField({ nullable: true })
  updatedCount: MaybeString;

  @Field(() => GraphQLJSON, { nullable: true })
  metadata: Record<string, any> | null;
}

@ObjectType()
export class SavedSearchEdge extends WithEdge(SavedSearch) {}

@ObjectType()
export class SavedSearchConnection extends WithConnection(SavedSearchEdge) {}
