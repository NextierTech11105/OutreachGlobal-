import { hashVerify } from "@/common/utils/hash";
import { BadRequestException, Injectable } from "@nestjs/common";
import { addHours } from "date-fns";
import { and, eq } from "drizzle-orm";
import { AccessTokenOptions, AuthAttemptOptions } from "../types/auth.type";
import { TokenName } from "../enums/token.enum";
import { JwtService } from "@/lib/jwt/jwt.service";
import { ModelNotFoundError, orFail } from "@/database/exceptions";
import { PersonalAccessTokenInsert } from "../models/personal-access-token.model";
import { personalAccessTokensTable } from "@/database/schema-alias";
import { InjectDB } from "@/database/decorators";
import type { DrizzleClient } from "@/database/types";
import { UserSelect } from "@/app/user/models/user.model";
import { getDatabaseSession } from "@haorama/drizzle-postgres-extra";
import { JwtPayload } from "@/lib/jwt/jwt.types";
import { WrongJtiError } from "@/lib/jwt/jwt.errors";

@Injectable()
export class AuthService {
  constructor(
    @InjectDB() private db: DrizzleClient,
    private jwtService: JwtService,
  ) {}

  async attempt(options: AuthAttemptOptions) {
    const user = await this.db.query.users
      .findFirst({
        where: (t, { eq }) => eq(t.email, options.email),
      })
      .then(orFail("user"));

    const passwordValid = await hashVerify(user.password, options.password);
    if (!passwordValid) {
      throw new BadRequestException("wrong password");
    }

    return { user };
  }

  async accessToken(user: UserSelect, options?: AccessTokenOptions) {
    const tx = getDatabaseSession(this.db, options?.session);
    const expiresIn = addHours(new Date(), 24);
    const tokenInsertValue: PersonalAccessTokenInsert = {
      name: options?.name ?? TokenName.WEBSITE,
      userId: user.id,
      expiredAt: expiresIn,
      lastUsedAt: new Date(),
    };

    const [personalAccessToken] = await tx
      .insert(personalAccessTokensTable)
      .values(tokenInsertValue)
      .returning();

    const token = await this.jwtService.sign({
      payload: {
        jti: personalAccessToken.id,
        sub: user.id,
        username: user.email,
      },
      expiresIn,
    });

    return { token };
  }

  async getUser(payload: JwtPayload) {
    if (!payload.jti || !payload.sub) {
      throw new WrongJtiError("invalid token");
    }
    const { sub, jti } = payload;

    const user = await this.db.query.users.findFirst({
      where: (fields, { eq }) => eq(fields.id, sub),
    });

    if (!user) {
      throw new ModelNotFoundError("user not found");
    }

    // JTI check
    await this.db.query.personalAccessTokens
      .findFirst({
        where: (t) => and(eq(t.id, jti), eq(t.userId, user.id)),
      })
      .then(orFail("token"));

    return user;
  }

  async revoke(payload: JwtPayload) {
    const { sub, jti } = payload;
    if (!sub || !jti) {
      throw new WrongJtiError("invalid token");
    }
    await this.db
      .delete(personalAccessTokensTable)
      .where(eq(personalAccessTokensTable.id, jti));

    return true;
  }
}
