import { IdField, IntField } from "@/app/apollo/decorators";
import { Field, ObjectType } from "@nestjs/graphql";

@ObjectType()
export class CallCenterReport {
  @IdField()
  teamId: string;

  @IntField({ defaultValue: 0 })
  totalCalls: number;

  @Field({ defaultValue: 0 })
  successRate: number;

  @IntField({ defaultValue: 0 })
  averageCallDuration: number;

  @IntField()
  aiSdrCalls: number;
}
