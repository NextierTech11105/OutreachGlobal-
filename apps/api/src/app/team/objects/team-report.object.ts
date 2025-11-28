import { IntField } from "@/app/apollo/decorators";
import { ObjectType } from "@nestjs/graphql";

@ObjectType()
export class TeamReport {
  @IntField({ defaultValue: 0 })
  verifiedLeadsCount: number;

  @IntField({ defaultValue: 0 })
  enrichedLeadsCount: number;

  @IntField({ defaultValue: 0 })
  highScoreLeadsCount: number;

  @IntField({ defaultValue: 0 })
  propertiesCount: number;
}
