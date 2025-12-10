export function numberFormat(value: number | null | undefined) {
  if (value == null) return "0";
  return value.toLocaleString("en-US");
}
