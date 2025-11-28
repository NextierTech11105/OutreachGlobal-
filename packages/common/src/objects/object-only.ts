type OnlyType<T, K extends keyof T> = K[];

export function objectOnly<T extends object = any, K extends keyof T = any>(
  data: T,
  fields: OnlyType<T, K>
) {
  const keys = typeof fields === "string" ? [fields] : fields;

  return keys
    .map((k) => (k in data ? { [k]: data[k] } : {}))
    .reduce((res: any, o) => Object.assign(res, o), {});
}
