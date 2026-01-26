import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { VoiceWebhookController } from "./controllers/voice-webhook.controller";
import {
  VoiceBroadcastController,
  VoiceBroadcastWebhookController,
} from "./controllers/voice-broadcast.controller";
import { VoiceService } from "./services/voice.service";
import { VoiceBroadcastService } from "./services/voice-broadcast.service";

@Module({
  imports: [ConfigModule],
  controllers: [
    VoiceWebhookController,
    VoiceBroadcastController,
    VoiceBroadcastWebhookController,
  ],
  providers: [VoiceService, VoiceBroadcastService],
  exports: [VoiceService, VoiceBroadcastService],
})
export class VoiceModule {}
