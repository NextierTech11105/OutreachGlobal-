import { CustomModule } from "@/common/decorators";
import { ConfigModule } from "@nestjs/config";
import { RealEstateService } from "./services/real-estate.service";
import { SpacesStorageService } from "./services/spaces-storage.service";
import { EventDetectionService } from "./services/event-detection.service";
import { PropertyTrackingService } from "./services/property-tracking.service";
import { BatchEnrichmentService } from "./services/batch-enrichment.service";
import { TeamModule } from "../team/team.module";
import { PropertyResolver } from "./resolvers/property.resolver";
import { PropertyController } from "./controllers/property.controller";
import { SavedSearchController } from "./controllers/saved-search.controller";
import { RealEstateAPIController } from "./controllers/realestate-api.controller";

@CustomModule({
  imports: [ConfigModule, TeamModule],
  controllers: [PropertyController, SavedSearchController, RealEstateAPIController],
  providers: [
    RealEstateService,
    SpacesStorageService,
    EventDetectionService,
    PropertyTrackingService,
    BatchEnrichmentService,
  ],
  resolvers: [PropertyResolver],
  exports: [
    RealEstateService,
    SpacesStorageService,
    EventDetectionService,
    PropertyTrackingService,
    BatchEnrichmentService,
  ],
})
export class PropertyModule {}
