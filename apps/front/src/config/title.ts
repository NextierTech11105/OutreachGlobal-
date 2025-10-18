const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "PushButtonCode";

export function getTitle(title: string) {
  return `${title} | ${APP_NAME}`;
}
