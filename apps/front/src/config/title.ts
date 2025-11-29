const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "Nextier";

export function getTitle(title: string) {
  return `${title} | ${APP_NAME}`;
}
