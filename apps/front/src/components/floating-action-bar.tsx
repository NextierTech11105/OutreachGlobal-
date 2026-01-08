"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Calendar,
  Mail,
  MessageSquare,
  Phone,
  Plus,
  Search,
  Upload,
  Zap,
  X,
} from "lucide-react";
import { GmailEmailComposer } from "@/components/gmail-email-composer";
import { cn } from "@/lib/utils";

/**
 * FLOATING ACTION BAR
 * ═══════════════════════════════════════════════════════════════════════════
 * Always visible at bottom-right of every page.
 * Quick access to:
 * - Calendar (open in slide-over)
 * - Email Compose (tb@outreachglobal.io)
 * - SMS Quick Send
 * - Quick Search
 * - Import CSV
 * ═══════════════════════════════════════════════════════════════════════════
 */

interface FloatingActionBarProps {
  /** Hide the FAB on specific pages */
  hidden?: boolean;
}

export function FloatingActionBar({ hidden = false }: FloatingActionBarProps) {
  const router = useRouter();
  const params = useParams<{ team?: string }>();
  const teamSlug = params?.team;

  const [isEmailOpen, setIsEmailOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  if (hidden) return null;

  const navigateTo = (path: string) => {
    if (teamSlug) {
      router.push(`/t/${teamSlug}${path}`);
    } else {
      router.push(path);
    }
  };

  const actions = [
    {
      id: "calendar",
      icon: Calendar,
      label: "Calendar",
      color: "text-blue-500",
      bgColor: "bg-blue-500/10 hover:bg-blue-500/20",
      onClick: () => navigateTo("/calendar"),
    },
    {
      id: "email",
      icon: Mail,
      label: "Compose Email",
      color: "text-red-500",
      bgColor: "bg-red-500/10 hover:bg-red-500/20",
      onClick: () => setIsEmailOpen(true),
    },
    {
      id: "sms",
      icon: MessageSquare,
      label: "Quick SMS",
      color: "text-green-500",
      bgColor: "bg-green-500/10 hover:bg-green-500/20",
      onClick: () => navigateTo("/sms/command-center"),
    },
    {
      id: "call",
      icon: Phone,
      label: "Power Dialer",
      color: "text-purple-500",
      bgColor: "bg-purple-500/10 hover:bg-purple-500/20",
      onClick: () => navigateTo("/power-dialer"),
    },
    {
      id: "import",
      icon: Upload,
      label: "Import CSV",
      color: "text-orange-500",
      bgColor: "bg-orange-500/10 hover:bg-orange-500/20",
      onClick: () => navigateTo("/import"),
    },
  ];

  return (
    <TooltipProvider>
      {/* Floating Action Button Group */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col-reverse items-end gap-2">
        {/* Expanded Actions */}
        {isExpanded && (
          <div className="flex flex-col-reverse gap-2 mb-2 animate-in slide-in-from-bottom-2 fade-in duration-200">
            {actions.map((action) => (
              <Tooltip key={action.id}>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className={cn(
                      "h-12 w-12 rounded-full shadow-lg border-2 transition-all",
                      action.bgColor,
                      action.color,
                    )}
                    onClick={action.onClick}
                  >
                    <action.icon className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left">
                  <p>{action.label}</p>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        )}

        {/* Main FAB Button */}
        <Button
          size="icon"
          className={cn(
            "h-14 w-14 rounded-full shadow-xl transition-all duration-200",
            isExpanded
              ? "bg-destructive hover:bg-destructive/90 rotate-45"
              : "bg-primary hover:bg-primary/90",
          )}
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? <X className="h-6 w-6" /> : <Zap className="h-6 w-6" />}
        </Button>

        {/* Quick Access Buttons (Always Visible) */}
        {!isExpanded && (
          <div className="flex gap-2 mb-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 rounded-full shadow-md bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 border-blue-500/30"
                  onClick={() => navigateTo("/calendar")}
                >
                  <Calendar className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">
                <p>Calendar</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 rounded-full shadow-md bg-red-500/10 hover:bg-red-500/20 text-red-500 border-red-500/30"
                  onClick={() => setIsEmailOpen(true)}
                >
                  <Mail className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">
                <p>Compose Email</p>
              </TooltipContent>
            </Tooltip>
          </div>
        )}
      </div>

      {/* Email Compose Dialog */}
      <Dialog open={isEmailOpen} onOpenChange={setIsEmailOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-red-500" />
              Compose Email
            </DialogTitle>
          </DialogHeader>
          <GmailEmailComposer
            onSent={() => setIsEmailOpen(false)}
            onCancel={() => setIsEmailOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
