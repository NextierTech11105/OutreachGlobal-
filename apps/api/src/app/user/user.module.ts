import { CustomModule } from "@/common/decorators";
import { UserRunner } from "./runners/user.runner";
import { CreateUserQuestion } from "./runners/create-user.question";
import { UserResolver } from "./resolvers/user.resolver";
import { UserService } from "./services/user.service";
import { ConfigModule } from "@nestjs/config";
import { DefaultAdminBootstrap } from "./bootstrap/default-admin.bootstrap";
import { MailModule } from "@/lib/mail/mail.module";

// NOTE: AuthModule is @Global() so AuthService is automatically available
// without explicit import - this avoids circular dependency with TeamModule

@CustomModule({
  imports: [ConfigModule, MailModule],
  runners: [UserRunner, CreateUserQuestion],
  resolvers: [UserResolver],
  providers: [UserService, DefaultAdminBootstrap],
  exports: [UserService],
})
export class UserModule {}
