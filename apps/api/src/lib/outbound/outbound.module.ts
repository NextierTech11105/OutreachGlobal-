import { Module, Global } from "@nestjs/common";
import { OutboundGateService } from "./outbound-gate.service";

@Global()
@Module({
  providers: [OutboundGateService],
  exports: [OutboundGateService],
})
export class OutboundModule {}
