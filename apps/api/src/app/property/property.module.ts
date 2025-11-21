import { CustomModule } from "@/common/decorators";
import { ConfigModule } from "@nestjs/config";
import { RealEstateService } from "./services/real-estate.service";
import { TeamModule } from "../team/team.module";
import { PropertyResolver } from "./resolvers/property.resolver";
import { PropertyController } from "./controllers/property.controller";
import { SavedSearchController } from "./controllers/saved-search.controller";

@CustomModule({
  imports: [ConfigModule, TeamModule],
  controllers: [PropertyController, SavedSearchController],
  providers: [RealEstateService],
  resolvers: [PropertyResolver],
  exports: [RealEstateService],
})
export class PropertyModule {}
