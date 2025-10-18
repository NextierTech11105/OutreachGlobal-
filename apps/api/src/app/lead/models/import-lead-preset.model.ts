import { TimestampModel } from "@/app/apollo/base-model";
import { JSONScalar } from "@/app/apollo/scalars/json.scalar";
import { importLeadPresetsTable } from "@/database/schema-alias";
import { Field, ObjectType } from "@nestjs/graphql";

export type ImportLeadPresetSelect = typeof importLeadPresetsTable.$inferSelect;
export type ImportLeadPresetInsert = typeof importLeadPresetsTable.$inferInsert;

@ObjectType()
export class ImportLeadPreset
  extends TimestampModel
  implements ImportLeadPresetSelect
{
  teamId: string;

  @Field()
  name: string;

  @Field(() => JSONScalar, { nullable: true })
  config: Record<string, any> | null;
}
