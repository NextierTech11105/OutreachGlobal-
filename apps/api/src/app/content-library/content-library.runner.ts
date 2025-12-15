import { Command, CommandRunner, Option } from "nest-commander";
import { InjectDB } from "@/database/decorators";
import { DrizzleClient } from "@/database/types";
import { seedContentLibrary } from "./seeds/default-categories.seed";
import { Injectable } from "@nestjs/common";

@Injectable()
@Command({ name: "content-library", description: "Manage content library" })
export class ContentLibraryRunner extends CommandRunner {
  constructor(@InjectDB() private readonly db: DrizzleClient) {
    super();
  }

  async run(passedParams: string[], options?: any): Promise<void> {
    if (options?.seed) {
      console.log("Seeding content library...");
      try {
        await seedContentLibrary(this.db);
        console.log("Content library seeded successfully!");
      } catch (error) {
        console.error("Failed to seed content library:", error);
        process.exit(1);
      }
    } else {
      console.log("Please specify an option. Use --help for more info.");
    }
  }

  @Option({
    flags: "-s, --seed",
    description: "Seed content library with default categories",
  })
  parseSeed(): boolean {
    return true;
  }
}
