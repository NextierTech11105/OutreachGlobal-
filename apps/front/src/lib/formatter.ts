export function formatNumber(value: number) {
  const formatter = new Intl.NumberFormat("en-US", {
    style: "decimal",
    compactDisplay: "short",
    notation: "standard",
  });

  return formatter.format(value);
}
