import { TimestampModel } from "@/app/apollo/base-model";
import { IntField, StringField } from "@/app/apollo/decorators";
import { WithConnection, WithEdge } from "@/app/apollo/graphql-relay";
import { Maybe, MaybeString } from "@/app/apollo/types/maybe.type";
import { leadsTable } from "@/database/schema-alias";
import { Field, ObjectType } from "@nestjs/graphql";
import { AnyObject } from "@nextier/common";

export type LeadSelect = typeof leadsTable.$inferSelect;
export type LeadInsert = typeof leadsTable.$inferInsert;

// Lead state canonical values
export type LeadStateCanonical =
  | "new"
  | "touched"
  | "responded"
  | "email_captured"
  | "high_intent"
  | "in_call_queue"
  | "closed"
  | "suppressed"
  | null;

@ObjectType()
export class Lead extends TimestampModel implements LeadSelect {
  teamId: string;
  integrationId: MaybeString;
  externalId: MaybeString;
  propertyId: MaybeString;

  @StringField({ nullable: true })
  firstName: MaybeString;

  @IntField()
  position: number;

  @StringField({ nullable: true })
  lastName: MaybeString;

  @StringField({ nullable: true })
  email: MaybeString;

  @StringField({ nullable: true })
  phone: MaybeString;

  @StringField({ nullable: true })
  title: MaybeString;

  @StringField({ nullable: true })
  company: MaybeString;

  @StringField({ nullable: true })
  zipCode: MaybeString;

  @StringField({ nullable: true })
  country: MaybeString;

  @StringField({ nullable: true })
  state: MaybeString;

  @StringField({ nullable: true })
  city: MaybeString;

  @StringField({ nullable: true })
  address: MaybeString;

  @StringField({ nullable: true })
  source: MaybeString;

  @StringField({ nullable: true })
  notes: MaybeString;

  @StringField({ nullable: true })
  status: MaybeString;

  @StringField({ defaultValue: "raw" })
  pipelineStatus: string;

  @StringField({ nullable: true })
  leadState: LeadStateCanonical;

  @IntField({ defaultValue: 0 })
  score: number;

  customFields: Maybe<AnyObject>;
  metadata: Maybe<AnyObject>;

  @Field(() => [String])
  tags: Maybe<string[]>;
}

@ObjectType()
export class LeadEdge extends WithEdge(Lead) {}

@ObjectType()
export class LeadConnection extends WithConnection(LeadEdge) {}
