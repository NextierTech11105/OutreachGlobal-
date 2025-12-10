/**
 * Safe string conversion utility
 * Prevents "Cannot read properties of undefined (reading 'toString')" errors
 */

export const safeString = (v: unknown): string => {
  if (v === null || v === undefined) return "";
  try {
    return String(v);
  } catch {
    return "";
  }
};

export const safeNumber = (v: unknown): number => {
  if (v === null || v === undefined) return 0;
  const num = Number(v);
  return isNaN(num) ? 0 : num;
};

export const safeFormat = (v: number | null | undefined): string => {
  if (v === null || v === undefined) return "0";
  return v.toLocaleString("en-US");
};

/**
 * Universal safe formatter - shorthand for any value
 * Use this to prevent hydration crashes from .toLocaleString() on undefined
 * @param v - Any value (number, string, null, undefined)
 * @returns Formatted string or "0" if invalid
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
