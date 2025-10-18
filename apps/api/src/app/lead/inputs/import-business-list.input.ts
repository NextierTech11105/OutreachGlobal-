import { InputType, Field } from "@nestjs/graphql";

@InputType()
export class ImportBusinessListInput {
  @Field()
  searchQuery: string;

  @Field(() => [String], { nullable: true })
  state?: string[];

  @Field(() => [String], { nullable: true })
  industry?: string[];

  @Field(() => [String], { nullable: true })
  title?: string[];

  @Field(() => [String], { nullable: true })
  company_name?: string[];

  @Field(() => [String], { nullable: true })
  company_domain?: string[];
}
