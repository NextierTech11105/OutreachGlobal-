import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";
import { primaryUlid } from "../columns/ulid";
import { createdAt, updatedAt } from "../columns/timestamps";
import { customNumeric } from "../columns/numeric";

export const propertyDistressScores = pgTable(
  "property_distress_scores",
  {
    id: primaryUlid("pds"),
    provider: varchar(),
    externalId: varchar(),
    uid: varchar(),
    address: text(),
    ownerName: varchar(),
    ownerType: varchar(),
    equityPercent: integer(),
    isVacant: boolean().default(false),
    loanMaturityDate: date(),
    reverseMortgage: boolean().default(false),
    zoning: varchar(),
    score: integer().default(0),
    lastSignalUpdate: timestamp(),
    metadata: jsonb(),
    createdAt,
    updatedAt,
  },
  (t) => [uniqueIndex().on(t.provider, t.externalId)],
);

export const properties = pgTable(
  "properties",
  {
    id: primaryUlid("prop"),
    externalId: varchar(),
    source: varchar(),
    ownerFirstName: varchar(),
    ownerLastName: varchar(),
    useCode: varchar(),
    type: varchar(),
    ownerOccupied: boolean().default(false),
    lotSquareFeet: customNumeric(),
    buildingSquareFeet: customNumeric(),
    auctionDate: timestamp(),
    assessedValue: customNumeric().notNull().default(0),
    estimatedValue: customNumeric().notNull().default(0),
    yearBuilt: integer(),
    address: jsonb(),
    mortgageInfo: jsonb(),
    tags: text().array(),
    metadata: jsonb(),
    createdAt,
    updatedAt,
  },
  (t) => [uniqueIndex().on(t.externalId, t.source)],
);
