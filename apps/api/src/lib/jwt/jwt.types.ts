import { ModuleMetadata, Provider, Type } from "@nestjs/common";

export enum JwtSecretRequestType {
  SIGN,
  VERIFY,
}

export interface JwtModuleOptions {
  global?: boolean;
  secret: string;
}

export interface JwtOptionsFactory {
  createJwtOptions(): Promise<JwtModuleOptions> | JwtModuleOptions;
}

export interface JwtModuleAsyncOptions extends Pick<ModuleMetadata, "imports"> {
  global?: boolean;
  useExisting?: Type<JwtOptionsFactory>;
  useClass?: Type<JwtOptionsFactory>;
  useFactory?: (...args: any[]) => Promise<JwtModuleOptions> | JwtModuleOptions;
  inject?: any[];
  extraProviders?: Provider[];
}

export interface JwtSignOptions {
  payload: JwtPayload;
  expiresIn?: Date;
}

export interface JwtVerifyOptions {
  secret?: string | Buffer;
  publicKey?: string | Buffer;
}

export type GetSecretKeyResult = string | Buffer;

export type JwtPayload = {
  /**
   * JWT Issuer
   *
   * @see {@link https://www.rfc-editor.org/rfc/rfc7519#section-4.1.1 RFC7519#section-4.1.1}
   */
  iss?: string;

  /**
   * JWT Subject
   *
   * @see {@link https://www.rfc-editor.org/rfc/rfc7519#section-4.1.2 RFC7519#section-4.1.2}
   */
  sub?: string;

  /**
   * JWT Audience
   *
   * @see {@link https://www.rfc-editor.org/rfc/rfc7519#section-4.1.3 RFC7519#section-4.1.3}
   */
  aud?: string | string[];

  /**
   * JWT ID
   *
   * @see {@link https://www.rfc-editor.org/rfc/rfc7519#section-4.1.7 RFC7519#section-4.1.7}
   */
  jti?: string;

  /**
   * JWT Not Before
   *
   * @see {@link https://www.rfc-editor.org/rfc/rfc7519#section-4.1.5 RFC7519#section-4.1.5}
   */
  nbf?: number;

  /**
   * JWT Expiration Time
   *
   * @see {@link https://www.rfc-editor.org/rfc/rfc7519#section-4.1.4 RFC7519#section-4.1.4}
   */
  exp?: number;

  /**
   * JWT Issued At
   *
   * @see {@link https://www.rfc-editor.org/rfc/rfc7519#section-4.1.6 RFC7519#section-4.1.6}
   */
  iat?: number;

  /** Any other JWT Claim Set member. */
  [propName: string]: unknown;
};
