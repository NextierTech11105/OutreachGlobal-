import {
  Command,
  CommandRunner,
  InquirerService,
  Option,
} from "nest-commander";
import { UserInsert } from "../models/user.model";
import { InjectDB } from "@/database/decorators";
import { DrizzleClient } from "@/database/types";
import {
  teamMembersTable,
  teamsTable,
  usersTable,
} from "@/database/schema-alias";
import { hashMake } from "@/common/utils/hash";
import { slugify, TeamMemberRole, TeamMemberStatus } from "@nextier/common";

@Command({ name: "user" })
export class UserRunner extends CommandRunner {
  constructor(
    private inquirer: InquirerService,
    @InjectDB() private db: DrizzleClient,
  ) {
    super();
  }

  async run(passedParams: string[], options?: Record<string, any>) {
    try {
      if (options?.create) {
        const data = await this.inquirer.ask<UserInsert>(
          "create-user-questions",
          undefined,
        );

        const [user] = await this.db
          .insert(usersTable)
          .values({
            ...data,
            password: await hashMake(data.password),
            emailVerifiedAt: new Date(),
          })
          .returning();

        const teamName = `${user.name}'s Team`;

        const [team] = await this.db
          .insert(teamsTable)
          .values({
            ownerId: user.id,
            name: teamName,
            slug: slugify(teamName),
          })
          .returning();

        await this.db.insert(teamMembersTable).values({
          userId: user.id,
          teamId: team.id,
          role: TeamMemberRole.OWNER,
          status: TeamMemberStatus.APPROVED,
        });
      }

      process.exit(0);
    } catch (error) {
      console.log(error);
      process.exit(1);
    }
  }

  @Option({ flags: "--create" })
  parseCreate(value: any) {
    return value;
  }
}
