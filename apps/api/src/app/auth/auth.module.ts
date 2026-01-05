import { JwtModule } from "@/lib/jwt/jwt.module";
import { MailModule } from "@/lib/mail/mail.module";
import { Global, Module, forwardRef } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { AuthService } from "./services/auth.service";
import { ApiKeyService } from "./services/api-key.service";
import { SignalHouseProvisioningService } from "./services/signalhouse-provisioning.service";
import { SignalHouseTenantService } from "./services/signalhouse-tenant.service";
import { TenantOnboardingService } from "./services/tenant-onboarding.service";
import { ApiKeyResolver } from "./resolvers/api-key.resolver";
import { TenantOnboardingResolver } from "./resolvers/tenant-onboarding.resolver";
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
    MailModule,
    forwardRef(() => TeamModule),
  ],
  providers: [
    AuthService,
    ApiKeyService,
    SignalHouseProvisioningService,
    SignalHouseTenantService,
    TenantOnboardingService,
    ApiKeyResolver,
    TenantOnboardingResolver,
  ],
  exports: [
    AuthService,
    ApiKeyService,
    SignalHouseProvisioningService,
    SignalHouseTenantService,
    TenantOnboardingService,
    JwtModule,
  ],
})
export class AuthModule {}
