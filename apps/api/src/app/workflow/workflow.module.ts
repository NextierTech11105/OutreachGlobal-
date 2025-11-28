import { CustomModule } from "@/common/decorators";
import { WorkflowSeeder } from "./seeders/workflow.seeder";
import { WorkflowResolver } from "./resolvers/workflow.resolver";
import { WorkflowService } from "./services/workflow.service";
import { TeamModule } from "../team/team.module";

@CustomModule({
  imports: [TeamModule],
  seeders: [WorkflowSeeder],
  resolvers: [WorkflowResolver],
  providers: [WorkflowService],
  exports: [WorkflowSeeder],
})
export class WorkflowModule {}
