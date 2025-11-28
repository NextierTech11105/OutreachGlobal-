import Cookies from "js-cookie";
import { COOKIE_PREFIX } from "./cookie-prefix";

function getKey(key: string) {
  return `${COOKIE_PREFIX}${key}`;
}

export const $cookie = {
  get: (key: string, ignorePrefix = false) =>
    Cookies.get(ignorePrefix ? key : getKey(key)),
  set: (key: string, value: string, options?: Cookies.CookieAttributes) => {
    return Cookies.set(getKey(key), value, options);
  },
  remove: (key: string, ignorePrefix = false) => {
    const keyToUse = ignorePrefix ? key : getKey(key);
    return Cookies.remove(keyToUse);
  },
};
