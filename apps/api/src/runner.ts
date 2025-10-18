import "dotenv/config";
import { CommandFactory } from "nest-commander";
import { AppModule } from "./app/app.module";

async function bootstrap() {
  await CommandFactory.run(AppModule, {
    errorHandler: () => {
      process.exit(1);
    },
    logger: ["error", "warn"],
  });
}

bootstrap();
