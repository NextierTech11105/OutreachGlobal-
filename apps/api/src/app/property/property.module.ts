import { CustomModule } from "@/common/decorators";
import { ConfigModule } from "@nestjs/config";
import { RealEstateService } from "./services/real-estate.service";
import { RealEstateAdvancedService } from "./services/real-estate-advanced.service";
import { TeamModule } from "../team/team.module";
import { PropertyResolver } from "./resolvers/property.resolver";
import { PropertyImportController } from "./controllers/property-import.controller";

@CustomModule({
  imports: [ConfigModule, TeamModule],
  controllers: [PropertyImportController],
  providers: [RealEstateService, RealEstateAdvancedService],
  resolvers: [PropertyResolver],
  exports: [RealEstateService, RealEstateAdvancedService],
})
export class PropertyModule {}
