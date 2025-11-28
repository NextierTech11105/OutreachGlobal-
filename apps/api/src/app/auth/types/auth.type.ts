import { WithSessionOptions } from "@/database/types";

export interface AuthAttemptOptions {
  email: string;
  password: string;
  /** two factor code if 2fa is enabled */
  code?: string;
}

export interface AccessTokenOptions extends WithSessionOptions {
  name?: string;
  rawUserAgent?: string;
}
