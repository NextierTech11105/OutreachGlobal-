export function setValueAsNumber(value?: any) {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  const numberValue = Number(value);
  if (isNaN(numberValue)) {
    return value;
  }

  return Number(value);
}

export function setValueAsISOString(val?: string | Date) {
  if (val instanceof Date) {
    return val.toISOString();
  }

  return val;
}
