"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface StepperContextValue {
  index: number;
  isCompleted: (index: number) => boolean;
}

const StepperContext = React.createContext<StepperContextValue>({
  index: 0,
  isCompleted: () => false,
});

interface StepperProps extends React.HTMLAttributes<HTMLDivElement> {
  index: number;
  children: React.ReactNode;
}

export function Stepper({
  index,
  children,
  className,
  ...props
}: StepperProps) {
  const childrenArray = React.Children.toArray(children);
  const steps = childrenArray.filter((child) => {
    return React.isValidElement(child) && child.type === Step;
  });

  const isCompleted = (stepIndex: number) => {
    return stepIndex < index;
  };

  return (
    <StepperContext.Provider value={{ index, isCompleted }}>
      <div className={cn("flex w-full justify-between", className)} {...props}>
        {steps.map((step, i) => {
          if (React.isValidElement(step)) {
            return React.cloneElement(step, {
              index: i,
              isActive: i === index,
              isCompleted: isCompleted(i),
              isLastStep: i === steps.length - 1,
            });
          }
          return step;
        })}
      </div>
    </StepperContext.Provider>
  );
}

interface StepProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  index?: number;
  isActive?: boolean;
  isCompleted?: boolean;
  isLastStep?: boolean;
}

export function Step({
  children,
  className,
  index,
  isActive,
  isCompleted,
  isLastStep,
  ...props
}: StepProps) {
  return (
    <div
      className={cn(
        "flex flex-1 flex-col items-center",
        isLastStep ? "flex-none" : "",
        className,
      )}
      {...props}
    >
      <div className="flex items-center">
        <div
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-full border-2 border-muted text-muted-foreground",
            isActive && "border-primary bg-primary text-primary-foreground",
            isCompleted && "border-primary bg-primary text-primary-foreground",
          )}
        >
          {isCompleted ? (
            <Check className="h-4 w-4" />
          ) : index !== undefined ? (
            index + 1
          ) : null}
        </div>
        {!isLastStep && (
          <div
            className={cn(
              "h-[2px] w-full min-w-12 max-w-32 bg-muted",
              isCompleted && "bg-primary",
            )}
          />
        )}
      </div>
      <div className="mt-2 text-center">{children}</div>
    </div>
  );
}

export function StepTitle({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("text-sm font-medium", className)} {...props}>
      {children}
    </div>
  );
}

export function StepDescription({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("text-xs text-muted-foreground", className)} {...props}>
      {children}
    </div>
  );
}
