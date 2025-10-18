import { IntField } from "@/app/apollo/decorators";
import { ObjectType } from "@nestjs/graphql";

@ObjectType()
export class LeadReport {
  @IntField()
  verifiedLeadsCount: number;

  @IntField()
  enrichedLeadsCount: number;

  @IntField()
  highScoreLeadsCount: number;
}
