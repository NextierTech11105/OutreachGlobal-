import { Global, Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { SignalHouseService } from "./signalhouse.service";

@Global()
@Module({
  imports: [ConfigModule],
  providers: [SignalHouseService],
  exports: [SignalHouseService],
})
export class SignalHouseModule {}
