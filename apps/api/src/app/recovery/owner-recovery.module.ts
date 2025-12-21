import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { OwnerRecoveryService } from "./owner-recovery.service";
import { OwnerRecoveryController } from "./owner-recovery.controller";

@Module({
  imports: [ConfigModule],
  providers: [OwnerRecoveryService],
  controllers: [OwnerRecoveryController],
  exports: [OwnerRecoveryService],
})
export class OwnerRecoveryModule {}
