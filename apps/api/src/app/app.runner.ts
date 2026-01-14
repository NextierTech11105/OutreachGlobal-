import { Command, CommandRunner, Option } from "nest-commander";
import { WorkflowSeeder } from "./workflow/seeders/workflow.seeder";
import { Logger } from "@nestjs/common";

@Command({ name: "app" })
export class AppRunner extends CommandRunner {
  private readonly logger = new Logger(AppRunner.name);

  constructor(private workflowSeeder: WorkflowSeeder) {
    super();
  }

  async run(params: any, options?: any) {
    try {
      if (options?.seed) {
        await this.workflowSeeder.run();
      }

      process.exit(0);
    } catch (error: any) {
      this.logger.error(`App runner error: ${error.message}`, error.stack);
      process.exit(1);
    }
  }

  @Option({ flags: "--seed" })
  parseSeed(value: any) {
    return value;
  }
}
