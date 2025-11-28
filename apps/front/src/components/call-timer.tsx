"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface CallTimerProps {
  startTime: Date;
  className?: string;
}

export function CallTimer({ startTime, className }: CallTimerProps) {
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const elapsed = Math.floor((now.getTime() - startTime.getTime()) / 1000);
      setElapsedTime(elapsed);
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  return (
    <span className={cn("font-mono", className)}>
      {formatTime(elapsedTime)}
    </span>
  );
}
