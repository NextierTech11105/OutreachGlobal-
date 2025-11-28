import { CustomModule } from "@/common/decorators";
import { TeamModule } from "../team/team.module";
import { ResourceResolver } from "./resource.resolver";
import { ResourceService } from "./resource.service";

@CustomModule({
  imports: [TeamModule],
  resolvers: [ResourceResolver],
  providers: [ResourceService],
  exports: [ResourceService],
})
export class ResourceModule {}
