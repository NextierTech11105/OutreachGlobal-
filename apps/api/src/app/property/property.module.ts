import { CustomModule } from "@/common/decorators";
import { ConfigModule } from "@nestjs/config";
import { RealEstateService } from "./services/real-estate.service";
import { TeamModule } from "../team/team.module";
import { PropertyResolver } from "./resolvers/property.resolver";

@CustomModule({
  imports: [ConfigModule, TeamModule],
  providers: [RealEstateService],
  resolvers: [PropertyResolver],
  exports: [RealEstateService],
})
export class PropertyModule {}
