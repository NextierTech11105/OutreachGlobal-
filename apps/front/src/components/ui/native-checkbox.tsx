import { cn } from "@/lib/utils";
import { InputHTMLAttributes, forwardRef } from "react";

export interface NativeCheckboxProps
  extends InputHTMLAttributes<HTMLInputElement> {}

export const NativeCheckbox = forwardRef<HTMLInputElement, NativeCheckboxProps>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        role="checkbox"
        {...props}
        type="checkbox"
        className={cn(
          "size-4 native-checkbox inline-block shrink-0 p-0 rounded-sm appearance-none bg-card",
          "bg-card",
          "disabled:pointer-events-none disabled:opacity-25",
          "border border-primary checked:bg-primary",
          className,
        )}
      />
    );
  },
);

NativeCheckbox.displayName = "NativeCheckbox";
