import { TimestampModel } from "@/app/apollo/base-model";
import {
  BooleanField,
  DateField,
  FloatField,
  IntField,
  JSONField,
  StringField,
} from "@/app/apollo/decorators";
import { WithConnection, WithEdge } from "@/app/apollo/graphql-relay";
import { MaybeNumber, MaybeString } from "@/app/apollo/types/maybe.type";
import { propertiesTable } from "@/database/schema-alias";
import { Field, ObjectType } from "@nestjs/graphql";

export type PropertySelect = typeof propertiesTable.$inferSelect;
export type PropertyInsert = typeof propertiesTable.$inferInsert;

@ObjectType()
export class Property extends TimestampModel implements PropertySelect {
  @StringField()
  teamId: string;

  @StringField({ nullable: true })
  externalId: MaybeString;

  source: MaybeString;

  @StringField({ nullable: true })
  ownerFirstName: MaybeString;

  @StringField({ nullable: true })
  ownerLastName: MaybeString;

  @StringField({ nullable: true })
  useCode: MaybeString;

  @StringField({ nullable: true })
  type: MaybeString;

  @BooleanField({ defaultValue: false })
  ownerOccupied: boolean;

  @FloatField({ nullable: true })
  lotSquareFeet: MaybeNumber;

  @FloatField({ nullable: true })
  buildingSquareFeet: MaybeNumber;

  @DateField({ nullable: true })
  auctionDate: Date;

  @IntField({ nullable: true })
  assessedValue: number;

  @IntField({ nullable: true })
  estimatedValue: number;

  @IntField({ nullable: true })
  yearBuilt: number;

  @JSONField({ nullable: true })
  address: any;

  @JSONField({ nullable: true })
  mortgageInfo: any;

  @Field(() => [String], { nullable: true })
  tags: string[] | null;

  @JSONField({ nullable: true })
  metadata: any;
}

@ObjectType()
export class PropertyEdge extends WithEdge(Property) {}

@ObjectType()
export class PropertyConnection extends WithConnection(PropertyEdge) {}
