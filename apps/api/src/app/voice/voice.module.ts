import { Module } from "@nestjs/common";
import { VoiceWebhookController } from "./controllers/voice-webhook.controller";
import { VoiceService } from "./services/voice.service";

@Module({
  controllers: [VoiceWebhookController],
  providers: [VoiceService],
  exports: [VoiceService],
})
export class VoiceModule {}
