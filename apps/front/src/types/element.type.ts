import type { FC, HTMLAttributes, ReactNode } from "react";

export type CFC<P extends Record<string, any> = Record<string, any>> = FC<
  P & { children?: ReactNode }
>;

export type DivProps = HTMLAttributes<HTMLDivElement>;
