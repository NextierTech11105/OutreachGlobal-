import * as React from "react";

export const Container = ({
  children,
  style,
  ...props
}: React.ComponentProps<"table">) => {
  return (
    <table
      {...props}
      align="center"
      width="100%"
      border={0}
      cellPadding="0"
      cellSpacing="0"
      role="presentation"
      style={{ maxWidth: "37.5em", ...style }}
    >
      <tbody>
        <tr style={{ width: "100%" }}>
          <td>{children}</td>
        </tr>
      </tbody>
    </table>
  );
};
