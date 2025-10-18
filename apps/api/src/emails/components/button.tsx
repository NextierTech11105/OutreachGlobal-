import * as React from "react";
import { Button as ReactButton } from "@react-email/button";

type Props = React.ComponentProps<"a">;

export const Button = ({ children, style, ...props }: Props) => {
  return (
    <ReactButton
      style={{
        backgroundColor: "#141414",
        color: "#fff",
        padding: "10px 20px",
        borderRadius: "4px",
        ...style,
      }}
      {...props}
    >
      {children}
    </ReactButton>
  );
};
