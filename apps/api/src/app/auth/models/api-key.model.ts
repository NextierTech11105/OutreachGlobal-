import { TimestampModel } from "@/app/apollo/base-model";
import { Field, ObjectType, registerEnumType } from "@nestjs/graphql";
import { ApiKeyType } from "@/database/schema";

// Register the enum for GraphQL
registerEnumType(
  { USER: "USER", ADMIN: "ADMIN", DEV: "DEV", OWNER: "OWNER", WHITE_LABEL: "WHITE_LABEL" },
  { name: "ApiKeyType", description: "Type of API key with different access levels" },
);

@ObjectType()
export class ApiKeyPermissions {
  @Field(() => Boolean, { nullable: true })
  canRead?: boolean;

  @Field(() => Boolean, { nullable: true })
  canWrite?: boolean;

  @Field(() => Boolean, { nullable: true })
  canDelete?: boolean;

  @Field(() => Boolean, { nullable: true })
  canManageTeam?: boolean;

  @Field(() => Boolean, { nullable: true })
  canManageUsers?: boolean;

  @Field(() => Boolean, { nullable: true })
  canAccessBilling?: boolean;
}

/**
 * API Key - shown in list views (without the actual key)
 */
@ObjectType()
export class ApiKey extends TimestampModel {
  @Field()
  keyPrefix: string;

  @Field()
  name: string;

  @Field()
  type: string;

  @Field()
  teamId: string;

  @Field(() => String, { nullable: true })
  userId: string | null;

  @Field(() => String, { nullable: true })
  description: string | null;

  @Field()
  isActive: boolean;

  @Field(() => Date, { nullable: true })
  lastUsedAt: Date | null;

  @Field(() => Date, { nullable: true })
  expiresAt: Date | null;
}

/**
 * New API Key Response - includes the raw key (only shown once!)
 */
@ObjectType()
export class NewApiKeyResponse {
  @Field()
  id: string;

  @Field({ description: "The raw API key - ONLY SHOWN ONCE! Copy it now." })
  key: string;

  @Field()
  keyPrefix: string;

  @Field()
  name: string;

  @Field()
  type: string;

  @Field()
  createdAt: Date;
}
