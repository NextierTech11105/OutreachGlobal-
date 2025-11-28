import { objectOnly } from "./object-only";

type ExceptType<T, K extends keyof T> = K | K[];

export function objectExcept<T extends object = any, K extends keyof T = any>(
  data: T,
  fields: ExceptType<T, K>
) {
  const keys = typeof fields === "string" ? [fields] : (fields as string[]);

  const vkeys = Object.keys(data).filter((k) => !keys.includes(k));

  return objectOnly(data, vkeys as any);
}
