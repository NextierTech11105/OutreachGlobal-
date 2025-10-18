export function cleanPhoneNumber(value?: string) {
  if (!value) {
    return undefined;
  }

  return value.replace(/[\s()-]/g, "");
}

export function formatPhoneNumber(cleanNumber: string): string | undefined {
  if (cleanNumber.length !== 10) {
    return undefined;
  }

  const areaCode = cleanNumber.slice(0, 3);
  const firstPart = cleanNumber.slice(3, 6);
  const secondPart = cleanNumber.slice(6);

  return `(${areaCode}) ${firstPart}-${secondPart}`;
}
