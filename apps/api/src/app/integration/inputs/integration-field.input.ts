import { StringField } from "@/app/apollo/decorators";
import { JSONScalar } from "@/app/apollo/scalars/json.scalar";
import { Field, InputType } from "@nestjs/graphql";
import { AnyObject } from "@nextier/common";

@InputType()
export class IntegrationFieldInput {
  @Field()
  sourceField: string;

  @Field()
  targetField: string;

  @StringField({ nullable: true })
  subField?: string | null;

  @Field(() => JSONScalar, { nullable: true })
  metadata?: AnyObject;
}
