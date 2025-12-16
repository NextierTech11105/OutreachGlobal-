/**
 * White Label Module
 * Provides white-label configuration and management
 */
import { Module, Global } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { WhiteLabelService } from "./white-label.service";
import { WhiteLabelController } from "./white-label.controller";

@Global()
@Module({
  imports: [ConfigModule],
  providers: [WhiteLabelService],
  controllers: [WhiteLabelController],
  exports: [WhiteLabelService],
})
export class WhiteLabelModule {}
