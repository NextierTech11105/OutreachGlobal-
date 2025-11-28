"use client";

import { cn } from "@/lib/utils";
import { MonitorIcon, MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="h-6 inline-flex items-center border rounded-xl text-muted-foreground">
      <button
        type="button"
        className={cn(
          "inline-flex items-center justify-center size-6",
          theme === "system" && "border rounded-full text-foreground",
        )}
        onClick={() => setTheme("system")}
      >
        <MonitorIcon className="size-4" />
      </button>

      <button
        type="button"
        className={cn(
          "inline-flex items-center justify-center size-6",
          theme === "light" && "border rounded-full text-foreground",
        )}
        onClick={() => setTheme("light")}
      >
        <SunIcon className="size-4" />
      </button>

      <button
        type="button"
        className={cn(
          "inline-flex items-center justify-center size-6",
          theme === "dark" && "border rounded-full text-foreground",
        )}
        onClick={() => setTheme("dark")}
      >
        <MoonIcon className="size-4" />
      </button>
    </div>
  );
}
