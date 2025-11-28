import * as React from "react";

export type HeadProps = React.ComponentProps<"head">;

export const Head = ({ children, ...props }: HeadProps) => {
  return (
    <head {...props}>
      <meta httpEquiv="Content-Type" content="text/html; charset=UTF-8" />
      {children}
    </head>
  );
};
