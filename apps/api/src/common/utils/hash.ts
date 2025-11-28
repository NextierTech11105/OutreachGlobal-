import * as argon from "argon2";

export function hashMake(plain: string) {
  return argon.hash(plain);
}

export function hashVerify(hash: string, plain: string) {
  return argon.verify(hash, plain);
}
