"use client";
import { cn } from "@/lib/utils";
import { forwardRef, useMemo } from "react";

export interface FieldErrorProps {
  error?: any;
  children?: React.ReactNode;
  className?: string;
  root?: boolean;
}

export const FieldErrors = forwardRef<HTMLSpanElement, FieldErrorProps>(
  ({ error, children, className }, ref) => {
    const resolvedError = useMemo(() => {
      return error?.root || error;
    }, [error]);

    const errorMessage = useMemo(() => {
      if (!!resolvedError?.message) {
        return resolvedError?.message;
      }
    }, [resolvedError]);

    if (!errorMessage) {
      return null;
    }

    if (children) {
      return children;
    }

    return (
      <span
        ref={ref}
        className={cn("block text-xs text-destructive font-medium", className)}
      >
        {errorMessage}
      </span>
    );
  },
);

FieldErrors.displayName = "FieldErrors";
