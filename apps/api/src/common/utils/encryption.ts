import { createCipheriv, randomBytes, scrypt } from "crypto";
import { promisify } from "util";

export async function encrypt(text: string, password: string) {
  const iv = randomBytes(16);

  // The key length is dependent on the algorithm.
  // In this case for aes256, it is 32 bytes.
  const key = (await promisify(scrypt)(password, "salt", 32)) as Buffer;
  const cipher = createCipheriv("aes-256-ctr", key, iv);
  const encryptedText = Buffer.concat([cipher.update(text), cipher.final()]);
  return encryptedText.toString("hex");
}
