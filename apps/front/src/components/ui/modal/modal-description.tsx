"use client";
import * as Dialog from "@radix-ui/react-dialog";
import { cn } from "@/lib/utils";

export function ModalDescription({
  className,
  ...props
}: React.ComponentProps<typeof Dialog.Description>) {
  return (
    <Dialog.Description
      data-slot="dialog-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  );
}
