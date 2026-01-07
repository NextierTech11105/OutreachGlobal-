import { Module } from "@nestjs/common";
import { AdminController } from "./admin.controller";

/**
 * Emergency Admin Module
 * Provides diagnostic and recovery tools for production emergencies
 */
@Module({
  controllers: [AdminController],
})
export class AdminModule {}
