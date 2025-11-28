import { Field, ObjectType } from "@nestjs/graphql";

@ObjectType()
export class UserAgent {
  @Field({ nullable: true })
  browserName?: string;

  @Field({ nullable: true })
  browserVersion?: string;

  @Field({ nullable: true })
  deviceModel?: string;

  @Field({ nullable: true })
  osName?: string;

  @Field({ nullable: true })
  osVersion?: string;

  @Field({ nullable: true })
  deviceBrand?: string;

  @Field({ nullable: true })
  deviceType?: string;
}
