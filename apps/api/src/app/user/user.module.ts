import { CustomModule } from "@/common/decorators";
import { UserRunner } from "./runners/user.runner";
import { CreateUserQuestion } from "./runners/create-user.question";
import { UserResolver } from "./resolvers/user.resolver";
import { UserService } from "./services/user.service";
import { ConfigModule } from "@nestjs/config";

@CustomModule({
  imports: [ConfigModule],
  runners: [UserRunner, CreateUserQuestion],
  resolvers: [UserResolver],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
