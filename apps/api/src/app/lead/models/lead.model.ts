import { TimestampModel } from "@/app/apollo/base-model";
import { IntField, StringField, BooleanField } from "@/app/apollo/decorators";
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
  | "retargeting"
  | "responded"
  | "soft_interest"
  | "email_captured"
  | "content_nurture"
  | "high_intent"
  | "appointment_booked"
  | "in_call_queue"
  | "closed"
  | "suppressed"
  | null;

// Enrichment status values
export type EnrichmentStatus =
  | "raw"
  | "traced"
  | "scored"
  | "ready"
  | "rejected"
  | "campaign"
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

  // ═══════════════════════════════════════════════════════════════════════
  // LUCI ENGINE: Data Enrichment Fields
  // ═══════════════════════════════════════════════════════════════════════

  @StringField({ nullable: true })
  leadId: MaybeString;

  @StringField({ nullable: true })
  enrichmentStatus: EnrichmentStatus;

  readyAt: Maybe<Date>;

  // TRACERFY: Skip Trace Results
  @StringField({ nullable: true })
  primaryPhone: MaybeString;

  @StringField({ nullable: true })
  primaryPhoneType: MaybeString;

  @StringField({ nullable: true })
  mobile1: MaybeString;

  @StringField({ nullable: true })
  mobile2: MaybeString;

  @StringField({ nullable: true })
  mobile3: MaybeString;

  @StringField({ nullable: true })
  mobile4: MaybeString;

  @StringField({ nullable: true })
  mobile5: MaybeString;

  @StringField({ nullable: true })
  landline1: MaybeString;

  @StringField({ nullable: true })
  landline2: MaybeString;

  @StringField({ nullable: true })
  landline3: MaybeString;

  @StringField({ nullable: true })
  email1: MaybeString;

  @StringField({ nullable: true })
  email2: MaybeString;

  @StringField({ nullable: true })
  email3: MaybeString;

  @StringField({ nullable: true })
  email4: MaybeString;

  @StringField({ nullable: true })
  email5: MaybeString;

  // TRESTLE: Phone Scoring
  @IntField({ nullable: true })
  phoneActivityScore: Maybe<number>;

  @StringField({ nullable: true })
  phoneContactGrade: MaybeString;

  @StringField({ nullable: true })
  phoneLineType: MaybeString;

  @BooleanField({ nullable: true })
  phoneNameMatch: Maybe<boolean>;

  // TRESTLE: Email Scoring
  @StringField({ nullable: true })
  emailContactGrade: MaybeString;

  @BooleanField({ nullable: true })
  emailNameMatch: Maybe<boolean>;

  // LUCI Tags
  @StringField({ nullable: true })
  sourceTag: MaybeString;

  @StringField({ nullable: true })
  sectorTag: MaybeString;

  @StringField({ nullable: true })
  sicTag: MaybeString;

  @StringField({ nullable: true })
  sicDescription: MaybeString;

  // USBizData Fields
  @StringField({ nullable: true })
  county: MaybeString;

  @StringField({ nullable: true })
  website: MaybeString;

  @StringField({ nullable: true })
  employees: MaybeString;

  @StringField({ nullable: true })
  annualSales: MaybeString;

  @StringField({ nullable: true })
  sicCode: MaybeString;

  // Campaign Assignment
  @StringField({ nullable: true })
  campaignId: MaybeString;

  @BooleanField({ nullable: true })
  smsReady: Maybe<boolean>;
}

@ObjectType()
export class LeadEdge extends WithEdge(Lead) {}

@ObjectType()
export class LeadConnection extends WithConnection(LeadEdge) {}
