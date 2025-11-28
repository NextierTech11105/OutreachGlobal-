import { IdField } from "@/app/apollo/decorators";
import { ArgsType, Field } from "@nestjs/graphql";

@ArgsType()
export class SearchFacetsArgs {
  @IdField()
  teamId: string;

  @Field({ nullable: true, description: "document query" })
  query?: string;

  @Field({ nullable: true, description: "facet / attribute query" })
  facetQuery?: string;

  @Field({ description: "facet name or attribute" })
  name: string;
}
