import { JSONScalar } from "@/app/apollo/scalars/json.scalar";
import { Field, InputType } from "@nestjs/graphql";
import { SaveLeadPresetDto } from "@nextier/dto";

@InputType()
export class ImportLeadPresetInput implements SaveLeadPresetDto {
  @Field()
  name: string;

  @Field(() => JSONScalar)
  config: SaveLeadPresetDto["config"];
}
