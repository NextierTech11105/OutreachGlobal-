import { IdField } from "@/app/apollo/decorators";
import { ObjectType } from "@nestjs/graphql";

@ObjectType()
export class LeadStatus {
  @IdField()
  id: string; // actually status
}
