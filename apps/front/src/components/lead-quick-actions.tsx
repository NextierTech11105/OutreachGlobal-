"use client";

import * as React from "react";
import { useState, useCallback } from "react";
import {
  Phone,
  MessageSquare,
  Mail,
  Copy,
  Check,
  MoreHorizontal,
  Calendar,
  UserPlus,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { cn } from "@/lib/utils";
import { toast } from "sonner";

/**
 * LEAD QUICK ACTIONS
 * ═══════════════════════════════════════════════════════════════════════════
 * Inline action buttons for any lead row/card in the system.
 *
 * Features:
 * - 📞 Click-to-Call → Opens tel: link or Twilio dialer
 * - 💬 Click-to-SMS → Opens sms: link or SignalHouse composer
 * - 📧 Click-to-Email → Opens mailto: link
 * - 📋 Copy → Copy phone/email to clipboard
 * - 📅 Schedule → Add to calendar
 *
 * Works seamlessly with Chrome extension for cross-site functionality.
 * ═══════════════════════════════════════════════════════════════════════════
 */

export interface LeadQuickActionsProps {
  /** Phone number (E.164 format preferred) */
  phone?: string | null;
  /** Email address */
  email?: string | null;
  /** Lead name for display */
  name?: string | null;
  /** Lead ID for tracking/logging */
  leadId?: string;
  /** Company name */
  company?: string | null;
  /** Button size variant */
  size?: "xs" | "sm" | "default" | "lg";
  /** Additional CSS classes */
  className?: string;
  /** Show all actions or just primary ones */
  variant?: "compact" | "full";
  /** Callback when any action is taken */
  onAction?: (action: "call" | "sms" | "email" | "copy", value: string) => void;
}

export function LeadQuickActions({
  phone,
  email,
  name,
  leadId,
  company,
  size = "sm",
  className,
  variant = "compact",
  onAction,
}: LeadQuickActionsProps) {
  const [copied, setCopied] = useState<"phone" | "email" | null>(null);

  // Normalize phone for dialing
  const normalizedPhone = React.useMemo(() => {
    if (!phone) return null;
    const digits = phone.replace(/\D/g, "");
    if (digits.length === 10) return `+1${digits}`;
    if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
    return phone;
  }, [phone]);

  // ─────────────────────────────────────────────────────────────────────────
  // CLICK TO CALL
  // ─────────────────────────────────────────────────────────────────────────
  const handleCall = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();

      if (!normalizedPhone) {
        toast.error("No phone number available");
        return;
      }

      // Use tel: protocol - works with Chrome extension too
      window.open(`tel:${normalizedPhone}`, "_self");
      toast.success(`Calling ${name || normalizedPhone}...`, {
        description: "Opening dialer",
      });

      onAction?.("call", normalizedPhone);
    },
    [normalizedPhone, name, onAction],
  );

  // ─────────────────────────────────────────────────────────────────────────
  // CLICK TO SMS
  // ─────────────────────────────────────────────────────────────────────────
  const handleSms = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();

      if (!normalizedPhone) {
        toast.error("No phone number available");
        return;
      }

      // Use sms: protocol - works with Chrome extension too
      window.open(`sms:${normalizedPhone}`, "_self");
      toast.success(`Opening SMS to ${name || normalizedPhone}`, {
        description: "Via SignalHouse 10DLC",
      });

      onAction?.("sms", normalizedPhone);
    },
    [normalizedPhone, name, onAction],
  );

  // ─────────────────────────────────────────────────────────────────────────
  // CLICK TO EMAIL
  // ─────────────────────────────────────────────────────────────────────────
  const handleEmail = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();

      if (!email) {
        toast.error("No email address available");
        return;
      }

      // Build mailto with subject
      const subject = company
        ? `Re: ${company}`
        : name
          ? `Hello ${name.split(" ")[0]}`
          : "";
      const mailtoUrl = subject
        ? `mailto:${email}?subject=${encodeURIComponent(subject)}`
        : `mailto:${email}`;

      window.open(mailtoUrl, "_self");
      toast.success(`Opening email to ${email}`);

      onAction?.("email", email);
    },
    [email, name, company, onAction],
  );

  // ─────────────────────────────────────────────────────────────────────────
  // COPY TO CLIPBOARD
  // ─────────────────────────────────────────────────────────────────────────
  const handleCopy = useCallback(
    (e: React.MouseEvent, value: string, type: "phone" | "email") => {
      e.stopPropagation();
      e.preventDefault();

      navigator.clipboard.writeText(value);
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
      toast.success(`${type === "phone" ? "Phone" : "Email"} copied!`);

      onAction?.("copy", value);
    },
    [onAction],
  );

  // Size configurations
  const sizeConfig = {
    xs: { button: "h-6 w-6", icon: "h-3 w-3" },
    sm: { button: "h-7 w-7", icon: "h-3.5 w-3.5" },
    default: { button: "h-8 w-8", icon: "h-4 w-4" },
    lg: { button: "h-10 w-10", icon: "h-5 w-5" },
  };

  const { button: buttonSize, icon: iconSize } = sizeConfig[size];

  // Check if we have any actions available
  const hasPhone = !!normalizedPhone;
  const hasEmail = !!email;
  const hasAnyAction = hasPhone || hasEmail;

  if (!hasAnyAction) {
    return (
      <span className="text-xs text-muted-foreground">No contact info</span>
    );
  }

  return (
    <TooltipProvider delayDuration={300}>
      <div
        className={cn("flex items-center gap-0.5", className)}
        onClick={(e) => e.stopPropagation()}
      >
        {/* CALL BUTTON */}
        {hasPhone && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  buttonSize,
                  "rounded-full hover:bg-emerald-100 hover:text-emerald-600 dark:hover:bg-emerald-900/30",
                )}
                onClick={handleCall}
              >
                <Phone className={iconSize} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              <p>Call {phone}</p>
            </TooltipContent>
          </Tooltip>
        )}

        {/* SMS BUTTON */}
        {hasPhone && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  buttonSize,
                  "rounded-full hover:bg-green-100 hover:text-green-600 dark:hover:bg-green-900/30",
                )}
                onClick={handleSms}
              >
                <MessageSquare className={iconSize} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              <p>SMS {phone}</p>
            </TooltipContent>
          </Tooltip>
        )}

        {/* EMAIL BUTTON */}
        {hasEmail && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  buttonSize,
                  "rounded-full hover:bg-blue-100 hover:text-blue-600 dark:hover:bg-blue-900/30",
                )}
                onClick={handleEmail}
              >
                <Mail className={iconSize} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              <p>Email {email}</p>
            </TooltipContent>
          </Tooltip>
        )}

        {/* MORE ACTIONS (Full variant) */}
        {variant === "full" && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(buttonSize, "rounded-full")}
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className={iconSize} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {hasPhone && (
                <>
                  <DropdownMenuItem onClick={handleCall}>
                    <Phone className="h-4 w-4 mr-2 text-emerald-500" />
                    Call {name || "Lead"}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleSms}>
                    <MessageSquare className="h-4 w-4 mr-2 text-green-500" />
                    Send SMS
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={(e) =>
                      handleCopy(e as any, normalizedPhone!, "phone")
                    }
                  >
                    {copied === "phone" ? (
                      <Check className="h-4 w-4 mr-2 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4 mr-2" />
                    )}
                    Copy Phone
                  </DropdownMenuItem>
                </>
              )}
              {hasPhone && hasEmail && <DropdownMenuSeparator />}
              {hasEmail && (
                <>
                  <DropdownMenuItem onClick={handleEmail}>
                    <Mail className="h-4 w-4 mr-2 text-blue-500" />
                    Send Email
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={(e) => handleCopy(e as any, email!, "email")}
                  >
                    {copied === "email" ? (
                      <Check className="h-4 w-4 mr-2 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4 mr-2" />
                    )}
                    Copy Email
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <Calendar className="h-4 w-4 mr-2 text-purple-500" />
                Schedule Follow-up
              </DropdownMenuItem>
              <DropdownMenuItem>
                <UserPlus className="h-4 w-4 mr-2 text-orange-500" />
                Add to Campaign
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* COPY BUTTON (Compact variant) */}
        {variant === "compact" && hasPhone && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(buttonSize, "rounded-full hover:bg-muted")}
                onClick={(e) => handleCopy(e, normalizedPhone!, "phone")}
              >
                {copied === "phone" ? (
                  <Check className={cn(iconSize, "text-green-500")} />
                ) : (
                  <Copy className={iconSize} />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              <p>Copy phone</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
}

/**
 * LEAD CONTACT PILLS
 * Compact display of contact methods with click actions
 */
export function LeadContactPills({
  phone,
  email,
  className,
}: {
  phone?: string | null;
  email?: string | null;
  className?: string;
}) {
  const handleCall = useCallback(() => {
    if (phone) window.open(`tel:${phone}`, "_self");
  }, [phone]);

  const handleSms = useCallback(() => {
    if (phone) window.open(`sms:${phone}`, "_self");
  }, [phone]);

  const handleEmail = useCallback(() => {
    if (email) window.open(`mailto:${email}`, "_self");
  }, [email]);

  return (
    <div className={cn("flex flex-wrap gap-1", className)}>
      {phone && (
        <>
          <button
            onClick={handleCall}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400"
          >
            <Phone className="h-3 w-3" />
            Call
          </button>
          <button
            onClick={handleSms}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400"
          >
            <MessageSquare className="h-3 w-3" />
            SMS
          </button>
        </>
      )}
      {email && (
        <button
          onClick={handleEmail}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400"
        >
          <Mail className="h-3 w-3" />
          Email
        </button>
      )}
    </div>
  );
}
