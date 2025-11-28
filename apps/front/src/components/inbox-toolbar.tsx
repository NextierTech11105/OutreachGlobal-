"use client";

import { Button } from "@/components/ui/button";
import { PanelLeft } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface InboxToolbarProps {
  onToggleSidebar: () => void;
  showSidebar: boolean;
}

export function InboxToolbar({
  onToggleSidebar,
  showSidebar,
}: InboxToolbarProps) {
  return (
    <div className="flex items-center gap-1">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onToggleSidebar}
            >
              <PanelLeft
                className={`h-4 w-4 ${!showSidebar && "rotate-180"}`}
              />
              <span className="sr-only">Toggle sidebar</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>{showSidebar ? "Hide" : "Show"} sidebar</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
