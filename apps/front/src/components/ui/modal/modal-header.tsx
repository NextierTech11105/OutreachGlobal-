import { cn } from "@/lib/utils";

export const ModalHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("p-4 flex justify-between items-center", className)}
    {...props}
  />
);

ModalHeader.displayName = "ModalHeader";
