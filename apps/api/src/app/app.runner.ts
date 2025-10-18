import { Command, CommandRunner, Option } from "nest-commander";
import { WorkflowSeeder } from "./workflow/seeders/workflow.seeder";

@Command({ name: "app" })
export class AppRunner extends CommandRunner {
  constructor(private workflowSeeder: WorkflowSeeder) {
    super();
  }

  async run(params: any, options?: any) {
    try {
      if (options?.seed) {
        await this.workflowSeeder.run();
      }

      process.exit(0);
    } catch (error) {
      console.log(error);
      process.exit(1);
    }
  }

  @Option({ flags: "--seed" })
  parseSeed(value: any) {
    return value;
  }
}
