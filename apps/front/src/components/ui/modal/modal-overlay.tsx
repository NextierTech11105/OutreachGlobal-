"use client";
import { forwardRef } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";

interface Props extends DialogPrimitive.DialogOverlayProps {
  /** default 30 */
  zIndex?: number;
}

export const ModalOverlay = forwardRef<HTMLDivElement, Props>(
  ({ className, zIndex = 30, ...props }, ref) => (
    <DialogPrimitive.Overlay asChild {...props}>
      <motion.div
        ref={ref}
        initial={{
          opacity: 0,
        }}
        animate={{
          opacity: 1,
          transition: {
            duration: 0.2,
            ease: "easeOut",
          },
        }}
        exit={{
          opacity: 0,
          transition: {
            duration: 0.2,
            ease: "easeIn",
          },
        }}
        className={cn("fixed bg-black/80 backdrop-blur-xs", className)}
        style={{ zIndex, inset: "0dvh" }}
      />
    </DialogPrimitive.Overlay>
  ),
);
ModalOverlay.displayName = "ModalOverlay";
