import { CustomModule } from "@/common/decorators";
import { TeamModule } from "../team/team.module";
import { RawDataLakeController } from "./raw-data-lake.controller";
import { RawDataLakeService } from "./raw-data-lake.service";

@CustomModule({
  imports: [TeamModule],
  controllers: [RawDataLakeController],
  providers: [RawDataLakeService],
  exports: [RawDataLakeService],
})
export class RawDataLakeModule {}
