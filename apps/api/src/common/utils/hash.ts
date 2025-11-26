import * as argon from "argon2";

export function hashMake(plain: string) {
  return argon.hash(plain);
}

export async function hashVerify(hash: string, plain: string) {
  if (!hash || typeof hash !== 'string' || !hash.startsWith('$')) {
    return false;
  }
  try {
    return await argon.verify(hash, plain);
  } catch {
    return false;
  }
}
