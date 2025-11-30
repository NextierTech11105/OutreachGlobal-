import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { VoiceWebhookController } from "./controllers/voice-webhook.controller";
import { VoiceService } from "./services/voice.service";

@Module({
  imports: [ConfigModule],
  controllers: [VoiceWebhookController],
  providers: [VoiceService],
  exports: [VoiceService],
})
export class VoiceModule {}
