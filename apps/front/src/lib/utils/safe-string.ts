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
