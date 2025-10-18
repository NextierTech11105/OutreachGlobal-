import { cn } from "@/lib/utils";
import type { DivProps } from "@/types/element.type";
import { forwardRef } from "react";

export const ModalBody = forwardRef<HTMLDivElement, DivProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div ref={ref} className={cn("p-4", className)} {...props}>
        {children}
      </div>
    );
  },
);

ModalBody.displayName = "ModalBody";
