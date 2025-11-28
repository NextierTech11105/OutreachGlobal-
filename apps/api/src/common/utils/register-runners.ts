export function registerRunners(...runners: any[]) {
  if (process.env.APP_MODE === "runner") {
    return runners;
  }

  return [];
}
