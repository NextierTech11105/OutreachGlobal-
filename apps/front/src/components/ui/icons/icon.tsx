import type { ForwardRefExoticComponent, RefAttributes, SVGProps } from "react";

export type IconComponent = ForwardRefExoticComponent<
  Omit<SVGProps<SVGSVGElement>, "ref"> & {
    title?: string;
    titleId?: string;
  } & RefAttributes<SVGSVGElement>
>;

export type IconProps = React.ComponentProps<"svg"> & {
  size?: number;
  as: IconComponent;
};

export const Icon: React.FC<IconProps> = ({ as: Component, ...props }) => {
  return <Component {...props} />;
};
