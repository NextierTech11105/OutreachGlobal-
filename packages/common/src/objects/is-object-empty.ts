export function isObjectEmpty<T extends object>(
  obj: any | undefined
): obj is undefined | (T & Record<string, never>) {
  return Object.keys(obj).length === 0;
}
