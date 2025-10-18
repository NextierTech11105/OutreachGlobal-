import { PageInfoArgs } from "@/app/apollo/args/page-info.args";
import { IdField } from "@/app/apollo/decorators";
import { ArgsType } from "@nestjs/graphql";

@ArgsType()
export class PropertyConnectionArgs extends PageInfoArgs {
  @IdField()
  teamId: string;
}
