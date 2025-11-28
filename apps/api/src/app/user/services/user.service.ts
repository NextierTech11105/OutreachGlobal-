import { Injectable } from "@nestjs/common";
import { LoginInput } from "../inputs/login.input";
import { AuthService } from "@/app/auth/services/auth.service";
import { UpdateProfileInput } from "../inputs/profile.input";
import { InjectDB } from "@/database/decorators";
import { DrizzleClient, PostgresTransaction } from "@/database/types";
import { usersTable } from "@/database/schema-alias";
import { eq } from "drizzle-orm";
import { UserInsert } from "../models/user.model";
import { getDatabaseSession } from "@haorama/drizzle-postgres-extra";

@Injectable()
export class UserService {
  constructor(
    private authService: AuthService,
    @InjectDB() private db: DrizzleClient,
  ) {}

  async login(input: LoginInput) {
    const { user } = await this.authService.attempt(input);
    const { token } = await this.authService.accessToken(user);

    return { user, token };
  }

  create(value: UserInsert, session?: PostgresTransaction) {
    const tx = getDatabaseSession(this.db, session);
    return tx.insert(usersTable).values(value).returning();
  }

  async updateProfile(userId: string, input: UpdateProfileInput) {
    const [user] = await this.db
      .update(usersTable)
      .set(input)
      .where(eq(usersTable.id, userId))
      .returning();

    return { user };
  }
}
