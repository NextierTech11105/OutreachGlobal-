import { cn } from "@/lib/utils";
import { HTMLAttributes, forwardRef } from "react";

interface Props extends HTMLAttributes<HTMLElement> {
  padding?: boolean;
}

export const TeamSection = forwardRef<HTMLElement, Props>(
  ({ className, children, padding = false, ...props }, ref) => {
    return (
      <section ref={ref} {...props} className={cn("py-6", className)}>
        {children}
      </section>
    );
  },
);

TeamSection.displayName = "TeamSection";
