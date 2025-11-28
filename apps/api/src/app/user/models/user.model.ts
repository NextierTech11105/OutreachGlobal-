import { TimestampModel } from "@/app/apollo/base-model";
import { DateField, StringField } from "@/app/apollo/decorators";
import { usersTable } from "@/database/schema-alias";
import { Field, ObjectType } from "@nestjs/graphql";

export type UserSelect = typeof usersTable.$inferSelect;
export type UserInsert = typeof usersTable.$inferInsert;

@ObjectType()
export class User extends TimestampModel implements UserSelect {
  @Field()
  name: string;

  @Field()
  email: string;

  @Field()
  role: string;

  @StringField()
  password: string;

  @DateField()
  emailVerifiedAt: Date | null;
}
