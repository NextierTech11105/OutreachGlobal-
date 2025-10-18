import { Field, ObjectType } from "@nestjs/graphql";

@ObjectType()
export class Facet {
  @Field()
  value: string;

  @Field({ defaultValue: 0 })
  count: number;
}

@ObjectType()
export class FacetResults {
  @Field(() => [Facet])
  hits: Facet[];
}
