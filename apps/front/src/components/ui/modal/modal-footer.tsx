import { cn } from "@/lib/utils";

export const ModalFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("border-t p-4 flex justify-end gap-2", className)}
    {...props}
  />
);
ModalFooter.displayName = "ModalFooter";
