import { JwtModule } from "@/lib/jwt/jwt.module";
import { Global, Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { AuthService } from "./services/auth.service";

@Global()
@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        return {
          global: true,
          secret: config.get("APP_SECRET") as string,
        };
      },
    }),
  ],
  providers: [AuthService],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
