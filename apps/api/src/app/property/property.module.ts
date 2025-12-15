import { CustomModule } from "@/common/decorators";
import { ConfigModule } from "@nestjs/config";
import { RealEstateService } from "./services/real-estate.service";
import { RealEstateSearchService } from "./services/real-estate-search.service";
import { TeamModule } from "../team/team.module";
import { PropertyResolver } from "./resolvers/property.resolver";
import {
  PropertyController,
  PropertySearchController,
} from "./controllers/property.controller";

@CustomModule({
  imports: [ConfigModule, TeamModule],
  controllers: [PropertyController, PropertySearchController],
  providers: [RealEstateService, RealEstateSearchService],
  resolvers: [PropertyResolver],
  exports: [RealEstateService, RealEstateSearchService],
})
export class PropertyModule {}
