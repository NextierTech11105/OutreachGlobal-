import { deepKeys, getProperty } from "@nextier/common";

export function formatTemplate(
  template: string,
  variables?: Record<string, string | number | null | undefined>,
) {
  if (!variables) {
    return template;
  }

  let message = template;

  const keys = Object.keys(variables);

  keys.forEach((key) => {
    message = message.replaceAll(`{{${key}}}`, String(variables[key]));
  });

  return message;
}

export function getVariables(records: Record<string, any>) {
  const variables: Record<string, any> = {};

  for (const key of deepKeys(records)) {
    variables[key] = getProperty(records, key);
  }

  return variables;
}
