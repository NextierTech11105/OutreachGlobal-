import { Inject, Injectable, Optional } from "@nestjs/common";
import type { JwtModuleOptions, JwtSignOptions } from "./jwt.types";
import { JWT_MODULE_OPTIONS } from "./jwt.constants";
import { createSigner, createVerifier } from "fast-jwt";

@Injectable()
export class JwtService {
  constructor(
    @Optional()
    @Inject(JWT_MODULE_OPTIONS)
    private readonly options: JwtModuleOptions,
  ) {}

  async sign({ payload, expiresIn }: JwtSignOptions) {
    const signer = createSigner({
      key: async () => this.options.secret,
      expiresIn: expiresIn !== undefined ? expiresIn.getTime() : undefined,
    });

    const token = await signer({
      ...payload,
      iat: Math.floor(Date.now() / 1000),
      iss: "nextier",
      exp: expiresIn !== undefined ? expiresIn.getTime() : undefined,
    });
    return token;
  }

  async verify(token: string) {
    const verifier = createVerifier({
      key: async () => this.options.secret,
    });

    const payload = await verifier(token);
    return { payload };
  }
}
