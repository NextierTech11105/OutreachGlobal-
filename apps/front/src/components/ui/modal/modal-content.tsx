"use client";
import { HTMLAttributes, forwardRef, useMemo } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { motion, TargetAndTransition } from "motion/react";
import { cn } from "@/lib/utils";
import { ModalPortal } from "./modal-portal";
import { ModalOverlay } from "./modal-overlay";

export interface ModalContentProps extends HTMLAttributes<HTMLDivElement> {
  widthClass?: string;
  /** default 50 */
  zIndex?: number;
  containerClass?: string;
  rootClass?: string;
  force?: "mobile" | "desktop";
}

const initial: TargetAndTransition = {
  opacity: 0,
  scale: 0.95,
};

const initialMobile: TargetAndTransition = {
  transform: "translateY(100%)",
};

const animate: TargetAndTransition = {
  opacity: 1,
  scale: 1,
  transition: {
    ease: "easeOut",
    duration: 0.3,
  },
};

const animateMobile: TargetAndTransition = {
  transform: "translateY(0)",
};

const exit: TargetAndTransition = {
  opacity: 0,
  scale: 0.95,
  transition: {
    ease: "easeIn",
    duration: 0.2,
  },
};

const exitMobile: TargetAndTransition = {
  transform: "translateY(100%)",
};

export const ModalContent = forwardRef<HTMLDivElement, ModalContentProps>(
  (
    { children, zIndex = 50, containerClass, className, force, rootClass },
    ref,
  ) => {
    const isMobileScreen = useMemo(() => {
      const width = document.body.getBoundingClientRect().width;

      return width < 640;
    }, []);

    const isMobile = useMemo(() => {
      if (force === "mobile") {
        return true;
      }

      return isMobileScreen;
    }, [isMobileScreen, force]);

    return (
      <ModalPortal>
        <ModalOverlay />

        <div
          className={cn("fixed", isMobile ? "inset-x-0" : "inset-0", rootClass)}
          style={{ zIndex, bottom: "0" }}
        >
          <div
            className={cn(
              "min-h-dvh flex justify-center",
              isMobile ? "items-end" : "items-center",
              containerClass,
            )}
          >
            <DialogPrimitive.Content
              ref={ref}
              asChild
              aria-describedby={undefined}
            >
              <motion.div
                className={cn(
                  "w-full sm:max-w-xl relative overflow-hidden bg-background rounded-none sm:rounded-md focus:outline-hidden focus:ring-0",
                  isMobile ? "border-t" : "border",
                  className,
                )}
                initial={isMobile ? initialMobile : initial}
                animate={isMobile ? animateMobile : animate}
                exit={isMobile ? exitMobile : exit}
                style={{
                  paddingBottom: "env(safe-area-inset-bottom, 0dvh)",
                }}
              >
                {children}
              </motion.div>
            </DialogPrimitive.Content>
          </div>
        </div>
      </ModalPortal>
    );
  },
);

ModalContent.displayName = "ModalContent";
