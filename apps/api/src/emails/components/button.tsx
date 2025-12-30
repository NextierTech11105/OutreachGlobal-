import * as React from "react";
import { Button as ReactButton } from "@react-email/button";

type Props = Omit<React.ComponentProps<typeof ReactButton>, "children"> & {
  children?: React.ReactNode;
};

export const Button = ({ children, style, ...props }: Props) => {
  const buttonStyle = {
    backgroundColor: "#141414",
    color: "#fff",
    padding: "10px 20px",
    borderRadius: "4px",
    ...style,
  } as React.CSSProperties;

  return (
    <ReactButton style={buttonStyle} {...props}>
      {children}
    </ReactButton>
  );
};
