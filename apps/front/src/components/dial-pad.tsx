"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DialPadProps {
  onDigitPress: (digit: string) => void;
  disabled?: boolean;
  className?: string;
}

export function DialPad({
  onDigitPress,
  disabled = false,
  className,
}: DialPadProps) {
  const digits = [
    { value: "1", letters: "" },
    { value: "2", letters: "ABC" },
    { value: "3", letters: "DEF" },
    { value: "4", letters: "GHI" },
    { value: "5", letters: "JKL" },
    { value: "6", letters: "MNO" },
    { value: "7", letters: "PQRS" },
    { value: "8", letters: "TUV" },
    { value: "9", letters: "WXYZ" },
    { value: "*", letters: "" },
    { value: "0", letters: "+" },
    { value: "#", letters: "" },
  ];

  return (
    <div className={cn("grid grid-cols-3 gap-3", className)}>
      {digits.map((digit) => (
        <Button
          key={digit.value}
          variant="outline"
          className="h-16 flex flex-col items-center justify-center py-2 hover:bg-muted/80 transition-colors"
          onClick={() => onDigitPress(digit.value)}
          disabled={disabled}
        >
          <span className="text-xl font-medium">{digit.value}</span>
          {digit.letters && (
            <span className="text-xs text-muted-foreground mt-0.5">
              {digit.letters}
            </span>
          )}
        </Button>
      ))}
    </div>
  );
}
