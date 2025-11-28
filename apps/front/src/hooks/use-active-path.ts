import { usePathname } from "next/navigation";
import { useCallback } from "react";

export interface UseActivePathOptions {
  baseUri: string;
}

export interface IsActiveOptions {
  href: string;
  exact?: boolean;
}

export function useActivePath({ baseUri }: UseActivePathOptions) {
  const pathname = usePathname();
  const isActive = useCallback(
    (item: IsActiveOptions) => {
      const href = item.href === baseUri ? baseUri : item.href;

      if (item.exact) {
        return pathname === href;
      }

      return pathname.startsWith(href);
    },
    [baseUri, pathname],
  );

  return [isActive] as const;
}
