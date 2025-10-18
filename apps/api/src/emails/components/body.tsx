import * as React from "react";

type RootProps = React.ComponentProps<"body">;

export const Body: React.FC<Readonly<RootProps>> = ({
  children,
  style,
  ...props
}) => {
  return (
    <body
      {...props}
      style={{
        backgroundColor: "#f6f3f4",
        fontFamily: "helvetica, sans-serif",
        ...style,
      }}
    >
      {children}
    </body>
  );
};

Body.displayName = "Body";
