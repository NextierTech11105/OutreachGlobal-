import { Field, ObjectType } from "@nestjs/graphql";
import {
  ImportLeadPreset,
  ImportLeadPresetSelect,
} from "../models/import-lead-preset.model";

@ObjectType()
export class CreateImportLeadPresetPayload {
  @Field(() => ImportLeadPreset)
  preset: ImportLeadPresetSelect;
}
