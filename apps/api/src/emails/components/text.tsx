import * as React from "react";

export type TextProps = React.ComponentProps<"p">;

export const Text: React.FC<TextProps> = ({ style, ...props }) => {
  return (
    <p
      {...props}
      style={{
        fontSize: "14px",
        lineHeight: "24px",
        margin: "16px 0",
        ...style,
      }}
    />
  );
};
