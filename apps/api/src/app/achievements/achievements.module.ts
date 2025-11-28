import { CustomModule } from "@/common/decorators";
import { TeamModule } from "../team/team.module";
import { AchievementResolver } from "./resolvers/achievement.resolver";
import { AchievementService } from "./services/achievement.service";

@CustomModule({
  imports: [TeamModule],
  resolvers: [AchievementResolver],
  providers: [AchievementService],
  exports: [AchievementService],
})
export class AchievementsModule {}
