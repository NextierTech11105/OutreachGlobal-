/**
 * Hydration-safe number formatter
 * Prevents "cannot read toString of undefined" crashes
 *
 * Use sf() anywhere you would use .toLocaleString() on a potentially undefined value
 *
 * Examples:
 *   {sf(value)} instead of {value.toLocaleString()}
 *   {sf(obj?.count)} instead of {obj?.count.toLocaleString()}
 *   title={`${sf(num)}`} instead of title={`${num.toLocaleString()}`}
 */
export const sf = (v: unknown): string => {
  if (v === null || v === undefined) return "0";
  try {
    const num = Number(v);
    if (isNaN(num)) return "0";
    return num.toLocaleString("en-US");
  } catch {
    return "0";
  }
};

/**
 * Safe currency formatter
 * Returns formatted currency string or "$0" for invalid values
 */
export const sfc = (v: unknown): string => {
  if (v === null || v === undefined) return "$0";
  try {
    const num = Number(v);
    if (isNaN(num)) return "$0";
    return `$${num.toLocaleString("en-US")}`;
  } catch {
    return "$0";
  }
};

/**
 * Safe date formatter
 * Returns formatted date string or "-" for invalid values
 */
export const sfd = (
  v: unknown,
  options?: Intl.DateTimeFormatOptions,
): string => {
  if (v === null || v === undefined) return "-";
  try {
    const date = new Date(v as string | number | Date);
    if (isNaN(date.getTime())) return "-";
    return date.toLocaleString("en-US", options);
  } catch {
    return "-";
  }
};

/**
 * Safe percentage formatter
 * Returns formatted percentage string or "0%" for invalid values
 */
export const sfp = (v: unknown, decimals = 0): string => {
  if (v === null || v === undefined) return "0%";
  try {
    const num = Number(v);
    if (isNaN(num)) return "0%";
    return `${num.toFixed(decimals)}%`;
  } catch {
    return "0%";
  }
};

/**
 * Safe string coercion
 * Returns string or empty string for null/undefined
 */
export const ss = (v: unknown): string => {
  if (v === null || v === undefined) return "";
  try {
    return String(v);
  } catch {
    return "";
  }
};
