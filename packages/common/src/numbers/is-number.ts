export function isNumber(value?: number): value is number {
  return typeof value === "number" && !isNaN(value);
}
