"use client";

import * as React from "react";
import {
  Phone,
  MessageSquare,
  Check,
  AlertTriangle,
  Star,
  Ban,
  Flag,
  Copy,
  MoreHorizontal,
  Smartphone,
  PhoneCall,
  Wifi,
  HelpCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

// Phone line types
export type PhoneLineType =
  | "mobile"
  | "landline"
  | "voip"
  | "toll_free"
  | "premium"
  | "unknown";

// Phone status/flags
export type PhoneFlag =
  | "confirmed"
  | "dnc"
  | "wrong_number"
  | "invalid"
  | "primary"
  | "secondary";

// Extended phone number interface
export interface StandardizedPhone {
  number: string;
  label?: string;
  lineType: PhoneLineType;
  isPrimary?: boolean;
  verified?: boolean;
  lastVerified?: string;
  carrier?: string;
  flags?: PhoneFlag[];
  score?: number; // 0-100 confidence score
}

interface StandardizedPhoneFieldProps {
  phones: StandardizedPhone[];
  onCall?: (phone: string) => void;
  onSMS?: (phone: string) => void;
  onFlag?: (phone: string, flag: PhoneFlag) => void;
  onCopy?: (phone: string) => void;
  compact?: boolean; // For table/list views
  showActions?: boolean;
  showAllPhones?: boolean; // Show all phones or just primary
  className?: string;
}

// Line type configurations
const LINE_TYPE_CONFIG: Record<
  PhoneLineType,
  { icon: React.ElementType; label: string; color: string; bgColor: string }
> = {
  mobile: {
    icon: Smartphone,
    label: "Mobile",
    color: "text-green-600",
    bgColor: "bg-green-500/10 border-green-500/20",
  },
  landline: {
    icon: PhoneCall,
    label: "Landline",
    color: "text-blue-600",
    bgColor: "bg-blue-500/10 border-blue-500/20",
  },
  voip: {
    icon: Wifi,
    label: "VoIP",
    color: "text-purple-600",
    bgColor: "bg-purple-500/10 border-purple-500/20",
  },
  toll_free: {
    icon: Phone,
    label: "Toll-Free",
    color: "text-cyan-600",
    bgColor: "bg-cyan-500/10 border-cyan-500/20",
  },
  premium: {
    icon: Star,
    label: "Premium",
    color: "text-yellow-600",
    bgColor: "bg-yellow-500/10 border-yellow-500/20",
  },
  unknown: {
    icon: HelpCircle,
    label: "Unknown",
    color: "text-gray-500",
    bgColor: "bg-gray-500/10 border-gray-500/20",
  },
};

// Flag configurations
const FLAG_CONFIG: Record<
  PhoneFlag,
  { label: string; color: string; icon: React.ElementType }
> = {
  confirmed: { label: "Confirmed", color: "bg-green-500", icon: Check },
  dnc: { label: "DNC", color: "bg-red-500", icon: Ban },
  wrong_number: {
    label: "Wrong #",
    color: "bg-orange-500",
    icon: AlertTriangle,
  },
  invalid: { label: "Invalid", color: "bg-gray-500", icon: AlertTriangle },
  primary: { label: "Primary", color: "bg-blue-500", icon: Star },
  secondary: { label: "Secondary", color: "bg-gray-400", icon: Phone },
};

// Format phone number for display
function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  if (cleaned.length === 11 && cleaned.startsWith("1")) {
    return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  }
  return phone;
}

// Single phone item component
function PhoneItem({
  phone,
  onCall,
  onSMS,
  onFlag,
  onCopy,
  compact = false,
  showActions = true,
}: {
  phone: StandardizedPhone;
  onCall?: (phone: string) => void;
  onSMS?: (phone: string) => void;
  onFlag?: (phone: string, flag: PhoneFlag) => void;
  onCopy?: (phone: string) => void;
  compact?: boolean;
  showActions?: boolean;
}) {
  const lineTypeConfig =
    LINE_TYPE_CONFIG[phone.lineType] || LINE_TYPE_CONFIG.unknown;
  const LineTypeIcon = lineTypeConfig.icon;

  const isDNC = phone.flags?.includes("dnc");
  const isWrongNumber = phone.flags?.includes("wrong_number");
  const isInvalid = phone.flags?.includes("invalid");
  const isDisabled = isDNC || isWrongNumber || isInvalid;

  const handleCopy = () => {
    navigator.clipboard.writeText(phone.number);
    onCopy?.(phone.number);
  };

  if (compact) {
    // Compact view for tables/lists
    return (
      <div
        className={cn(
          "flex items-center gap-2 group",
          isDisabled && "opacity-50",
        )}
      >
        {/* Line type badge */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge
                variant="outline"
                className={cn(
                  "h-5 px-1.5 text-xs font-medium",
                  lineTypeConfig.bgColor,
                  lineTypeConfig.color,
                )}
              >
                <LineTypeIcon className="h-3 w-3" />
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <p>{lineTypeConfig.label}</p>
              {phone.carrier && (
                <p className="text-xs text-muted-foreground">{phone.carrier}</p>
              )}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Phone number */}
        <span
          className={cn(
            "font-mono text-sm",
            phone.isPrimary && "font-semibold",
            isDisabled && "line-through",
          )}
        >
          {formatPhoneNumber(phone.number)}
        </span>

        {/* Primary indicator */}
        {phone.isPrimary && (
          <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
        )}

        {/* Verification status */}
        {phone.verified && <Check className="h-3 w-3 text-green-500" />}

        {/* Flags */}
        {isDNC && (
          <Badge variant="destructive" className="h-4 px-1 text-[10px]">
            DNC
          </Badge>
        )}
        {isWrongNumber && (
          <Badge
            variant="outline"
            className="h-4 px-1 text-[10px] bg-orange-500/10 text-orange-600 border-orange-500/20"
          >
            Wrong
          </Badge>
        )}

        {/* Quick actions on hover */}
        {showActions && !isDisabled && (
          <div className="hidden group-hover:flex items-center gap-1 ml-auto">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => onCall?.(phone.number)}
                  >
                    <Phone className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Call</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {phone.lineType === "mobile" && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => onSMS?.(phone.number)}
                    >
                      <MessageSquare className="h-3 w-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Send SMS</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <MoreHorizontal className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleCopy}>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Number
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => onFlag?.(phone.number, "confirmed")}
                >
                  <Check className="h-4 w-4 mr-2 text-green-500" />
                  Mark Confirmed
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onFlag?.(phone.number, "wrong_number")}
                >
                  <AlertTriangle className="h-4 w-4 mr-2 text-orange-500" />
                  Mark Wrong Number
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onFlag?.(phone.number, "dnc")}
                  className="text-red-600"
                >
                  <Ban className="h-4 w-4 mr-2" />
                  Add to DNC
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>
    );
  }

  // Full view
  return (
    <div
      className={cn(
        "flex items-center justify-between p-3 rounded-lg border bg-card",
        isDisabled && "opacity-50 bg-muted",
      )}
    >
      <div className="flex items-center gap-3">
        {/* Line type icon */}
        <div className={cn("p-2 rounded-lg", lineTypeConfig.bgColor)}>
          <LineTypeIcon className={cn("h-5 w-5", lineTypeConfig.color)} />
        </div>

        <div>
          {/* Phone number */}
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "font-mono font-medium",
                isDisabled && "line-through",
              )}
            >
              {formatPhoneNumber(phone.number)}
            </span>
            {phone.isPrimary && (
              <Badge variant="secondary" className="text-xs">
                Primary
              </Badge>
            )}
            {phone.verified && (
              <Badge
                variant="outline"
                className="text-xs bg-green-500/10 text-green-600 border-green-500/20"
              >
                <Check className="h-3 w-3 mr-1" />
                Verified
              </Badge>
            )}
          </div>

          {/* Meta info */}
          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
            <Badge
              variant="outline"
              className={cn(
                "text-xs",
                lineTypeConfig.bgColor,
                lineTypeConfig.color,
              )}
            >
              {lineTypeConfig.label}
            </Badge>
            {phone.carrier && <span>{phone.carrier}</span>}
            {phone.label && <span>• {phone.label}</span>}
            {phone.score !== undefined && (
              <span>• {phone.score}% confidence</span>
            )}
          </div>

          {/* Flags */}
          {phone.flags && phone.flags.length > 0 && (
            <div className="flex items-center gap-1 mt-1">
              {phone.flags.map((flag) => {
                const config = FLAG_CONFIG[flag];
                if (!config || flag === "primary" || flag === "secondary")
                  return null;
                return (
                  <Badge
                    key={flag}
                    className={cn("text-xs text-white", config.color)}
                  >
                    {config.label}
                  </Badge>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      {showActions && !isDisabled && (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onCall?.(phone.number)}
          >
            <Phone className="h-4 w-4 mr-2" />
            Call
          </Button>

          {phone.lineType === "mobile" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onSMS?.(phone.number)}
            >
              <MessageSquare className="h-4 w-4 mr-2" />
              SMS
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <Flag className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleCopy}>
                <Copy className="h-4 w-4 mr-2" />
                Copy Number
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onFlag?.(phone.number, "confirmed")}
              >
                <Check className="h-4 w-4 mr-2 text-green-500" />
                Mark as Confirmed
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onFlag?.(phone.number, "primary")}
              >
                <Star className="h-4 w-4 mr-2 text-yellow-500" />
                Set as Primary
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onFlag?.(phone.number, "wrong_number")}
              >
                <AlertTriangle className="h-4 w-4 mr-2 text-orange-500" />
                Mark as Wrong Number
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onFlag?.(phone.number, "dnc")}
                className="text-red-600"
              >
                <Ban className="h-4 w-4 mr-2" />
                Add to Do Not Call
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  );
}

// Main component
export function StandardizedPhoneField({
  phones,
  onCall,
  onSMS,
  onFlag,
  onCopy,
  compact = false,
  showActions = true,
  showAllPhones = false,
  className,
}: StandardizedPhoneFieldProps) {
  if (!phones || phones.length === 0) {
    return (
      <div className={cn("text-sm text-muted-foreground", className)}>
        No phone numbers
      </div>
    );
  }

  // Sort phones: primary first, then by score
  const sortedPhones = [...phones].sort((a, b) => {
    if (a.isPrimary && !b.isPrimary) return -1;
    if (!a.isPrimary && b.isPrimary) return 1;
    return (b.score || 0) - (a.score || 0);
  });

  // Filter out DNC/invalid phones for display if not showing all
  const displayPhones = showAllPhones
    ? sortedPhones
    : sortedPhones.filter(
        (p) => !p.flags?.includes("dnc") && !p.flags?.includes("invalid"),
      );

  const phonesToShow = compact ? displayPhones.slice(0, 2) : displayPhones;
  const hiddenCount = displayPhones.length - phonesToShow.length;

  return (
    <div className={cn("space-y-2", className)}>
      {phonesToShow.map((phone, idx) => (
        <PhoneItem
          key={`${phone.number}-${idx}`}
          phone={phone}
          onCall={onCall}
          onSMS={onSMS}
          onFlag={onFlag}
          onCopy={onCopy}
          compact={compact}
          showActions={showActions}
        />
      ))}
      {hiddenCount > 0 && (
        <div className="text-xs text-muted-foreground pl-8">
          +{hiddenCount} more phone{hiddenCount > 1 ? "s" : ""}
        </div>
      )}
    </div>
  );
}

// Helper function to convert old phone format to standardized format
export function toStandardizedPhone(
  phone: string | { number: string; type?: string; score?: number },
  lineType: PhoneLineType = "unknown",
  isPrimary = false,
  verified = false,
): StandardizedPhone {
  if (typeof phone === "string") {
    return {
      number: phone,
      lineType,
      isPrimary,
      verified,
    };
  }
  return {
    number: phone.number,
    lineType: (phone.type as PhoneLineType) || lineType,
    isPrimary,
    verified,
    score: phone.score,
  };
}

// Helper to convert array of phone strings to StandardizedPhone[]
export function toStandardizedPhones(
  phones: Array<string | { number: string; type?: string; score?: number }>,
  defaultLineType: PhoneLineType = "mobile",
): StandardizedPhone[] {
  return phones.map((p, idx) =>
    toStandardizedPhone(p, defaultLineType, idx === 0),
  );
}
