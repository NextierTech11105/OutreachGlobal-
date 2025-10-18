import { IdField } from "@/app/apollo/decorators";
import { JSONScalar } from "@/app/apollo/scalars/json.scalar";
import { Field, ObjectType } from "@nestjs/graphql";
import { AnyObject } from "@nextier/common";
// not nestjs module metadata but Zoho module metadata
@ObjectType()
export class ModuleMetadata {
  @IdField()
  name: string;

  @Field(() => JSONScalar)
  fields: AnyObject[];
}
