import * as React from "react";

export type SectionProps = React.ComponentProps<"table">;

export const Section: React.FC<SectionProps> = ({ children, ...props }) => {
  return (
    <table
      align="center"
      width="100%"
      border={0}
      cellPadding="0"
      cellSpacing="0"
      role="presentation"
      {...props}
    >
      <tbody>
        <tr>
          <td>{children}</td>
        </tr>
      </tbody>
    </table>
  );
};
