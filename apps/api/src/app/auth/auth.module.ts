import { JwtModule } from "@/lib/jwt/jwt.module";
import { Global, Module, forwardRef } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { AuthService } from "./services/auth.service";
import { ApiKeyService } from "./services/api-key.service";
import { ApiKeyResolver } from "./resolvers/api-key.resolver";
import { TeamModule } from "@/app/team/team.module";

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
    forwardRef(() => TeamModule),
  ],
  providers: [AuthService, ApiKeyService, ApiKeyResolver],
  exports: [AuthService, ApiKeyService, JwtModule],
})
export class AuthModule {}
