import type { ReactNode } from "react";

export interface PageProps<
  P extends Record<string, any> = {},
  SP extends Record<string, any> = {},
> {
  params: Promise<P>;
  searchParams: Promise<SP>;
}

export interface LayoutProps<P extends Record<string, any> = {}> {
  children: ReactNode;
  params: Promise<P>;
}
