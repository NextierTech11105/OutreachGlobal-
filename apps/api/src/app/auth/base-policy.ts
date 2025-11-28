import { UnauthorizedException } from "@nestjs/common";

interface AuthorizeOptions {
  message?: string;
  code?: string;
}

export class BasePolicy {
  public message = "Unauthorized";

  protected authorize<T = any>(value: T, options?: AuthorizeOptions) {
    if (!value) {
      throw new UnauthorizedException({
        message: options?.message || this.message,
        code: options?.code || "UNAUTHORIZED",
      });
    }

    return value;
  }

  can(): Omit<this, "can" | "message"> {
    return this;
  }
}
