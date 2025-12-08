"use client";

import * as React from "react";
import { useState } from "react";
import {
  Phone,
  Mail,
  MessageSquare,
  Check,
  AlertTriangle,
  Star,
  Ban,
  Copy,
  MoreHorizontal,
  Smartphone,
  PhoneCall,
  Wifi,
  HelpCircle,
  User,
  Building2,
  Plus,
  Pencil,
  Save,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

// ============================================
// TYPES - Standardized Owner Contact Structure
// ============================================

export type PhoneLineType = "mobile" | "landline" | "voip" | "toll_free" | "unknown";
export type PhoneStatus = "verified" | "unverified" | "invalid" | "dnc" | "wrong_number";
export type EmailStatus = "verified" | "unverified" | "invalid" | "bounced";

export interface ContactPhone {
  number: string;
  lineType: PhoneLineType;
  status: PhoneStatus;
  isPrimary: boolean;
  carrier?: string;
  score?: number; // Confidence score 0-100
  lastVerified?: string;
}

export interface ContactEmail {
  email: string;
  type: "personal" | "business" | "other";
  status: EmailStatus;
  isPrimary: boolean;
  score?: number;
  lastVerified?: string;
}

// Owner contact with exactly 3 phone and 3 email slots
export interface OwnerContact {
  id?: string;
  name: string;
  firstName?: string;
  lastName?: string;
  title?: string; // e.g., "Owner", "Property Manager", "CEO"
  company?: string;

  // 3 Phone slots
  phone1: ContactPhone | null;
  phone2: ContactPhone | null;
  phone3: ContactPhone | null;

  // 3 Email slots
  email1: ContactEmail | null;
  email2: ContactEmail | null;
  email3: ContactEmail | null;

  // Metadata
  source: "skip_trace" | "apollo" | "manual" | "import" | "enrichment";
  skipTracedAt?: string;
  enrichedAt?: string;
  isLeadReady: boolean; // True when at least 1 valid phone or email
}

// Line type configurations
const LINE_TYPE_CONFIG: Record<PhoneLineType, { icon: React.ElementType; label: string; color: string; bgColor: string }> = {
  mobile: { icon: Smartphone, label: "Mobile", color: "text-green-600", bgColor: "bg-green-500/10" },
  landline: { icon: PhoneCall, label: "Landline", color: "text-blue-600", bgColor: "bg-blue-500/10" },
  voip: { icon: Wifi, label: "VoIP", color: "text-purple-600", bgColor: "bg-purple-500/10" },
  toll_free: { icon: Phone, label: "Toll-Free", color: "text-cyan-600", bgColor: "bg-cyan-500/10" },
  unknown: { icon: HelpCircle, label: "Unknown", color: "text-gray-500", bgColor: "bg-gray-500/10" },
};

const PHONE_STATUS_CONFIG: Record<PhoneStatus, { label: string; color: string; icon: React.ElementType }> = {
  verified: { label: "Verified", color: "text-green-600", icon: Check },
  unverified: { label: "Unverified", color: "text-yellow-600", icon: AlertTriangle },
  invalid: { label: "Invalid", color: "text-red-600", icon: X },
  dnc: { label: "DNC", color: "text-red-600", icon: Ban },
  wrong_number: { label: "Wrong #", color: "text-orange-600", icon: AlertTriangle },
};

const EMAIL_STATUS_CONFIG: Record<EmailStatus, { label: string; color: string }> = {
  verified: { label: "Verified", color: "text-green-600" },
  unverified: { label: "Unverified", color: "text-yellow-600" },
  invalid: { label: "Invalid", color: "text-red-600" },
  bounced: { label: "Bounced", color: "text-red-600" },
};

// Format phone number
function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  if (cleaned.length === 11 && cleaned.startsWith("1")) {
    return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  }
  return phone;
}

// ============================================
// PHONE SLOT COMPONENT
// ============================================

interface PhoneSlotProps {
  slot: 1 | 2 | 3;
  phone: ContactPhone | null;
  onCall?: (phone: string) => void;
  onSMS?: (phone: string) => void;
  onChange?: (phone: ContactPhone | null) => void;
  onFlag?: (phone: string, status: PhoneStatus) => void;
  editable?: boolean;
}

function PhoneSlot({ slot, phone, onCall, onSMS, onChange, onFlag, editable = false }: PhoneSlotProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(phone?.number || "");
  const [editType, setEditType] = useState<PhoneLineType>(phone?.lineType || "mobile");

  if (!phone && !editable) {
    return (
      <div className="flex items-center gap-2 p-2 rounded-lg border border-dashed border-muted-foreground/30 text-muted-foreground text-sm">
        <Phone className="h-4 w-4" />
        <span>Phone {slot} - Empty</span>
      </div>
    );
  }

  if (!phone && editable) {
    return (
      <div className="flex items-center gap-2 p-2 rounded-lg border border-dashed border-muted-foreground/30">
        <Phone className="h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={`Add phone ${slot}`}
          className="h-7 text-sm"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
        />
        <Select value={editType} onValueChange={(v) => setEditType(v as PhoneLineType)}>
          <SelectTrigger className="w-24 h-7 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="mobile">Mobile</SelectItem>
            <SelectItem value="landline">Landline</SelectItem>
            <SelectItem value="voip">VoIP</SelectItem>
          </SelectContent>
        </Select>
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7"
          onClick={() => {
            if (editValue) {
              onChange?.({
                number: editValue,
                lineType: editType,
                status: "unverified",
                isPrimary: slot === 1,
              });
              setEditValue("");
            }
          }}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  const config = LINE_TYPE_CONFIG[phone!.lineType] || LINE_TYPE_CONFIG.unknown;
  const statusConfig = PHONE_STATUS_CONFIG[phone!.status];
  const LineIcon = config.icon;
  const StatusIcon = statusConfig.icon;
  const isDisabled = phone!.status === "dnc" || phone!.status === "invalid" || phone!.status === "wrong_number";

  return (
    <div className={cn(
      "flex items-center gap-2 p-2 rounded-lg border transition-colors group",
      isDisabled ? "bg-muted/50 opacity-60" : "hover:border-primary/50",
      phone!.isPrimary && "border-primary/30 bg-primary/5"
    )}>
      {/* Line Type Badge */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <Badge variant="outline" className={cn("h-6 px-1.5", config.bgColor, config.color)}>
              <LineIcon className="h-3.5 w-3.5" />
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>{config.label}</p>
            {phone!.carrier && <p className="text-xs text-muted-foreground">{phone!.carrier}</p>}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Phone Number */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={cn(
            "font-mono font-medium truncate",
            isDisabled && "line-through"
          )}>
            {formatPhone(phone!.number)}
          </span>
          {phone!.isPrimary && <Star className="h-3 w-3 text-yellow-500 fill-yellow-500 flex-shrink-0" />}
        </div>
        <div className="flex items-center gap-1 mt-0.5">
          <StatusIcon className={cn("h-3 w-3", statusConfig.color)} />
          <span className={cn("text-xs", statusConfig.color)}>{statusConfig.label}</span>
          {phone!.score && <span className="text-xs text-muted-foreground">• {phone!.score}%</span>}
        </div>
      </div>

      {/* Actions */}
      {!isDisabled && (
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50"
                  onClick={() => onCall?.(phone!.number)}
                >
                  <Phone className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Call</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {phone!.lineType === "mobile" && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                    onClick={() => onSMS?.(phone!.number)}
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Send SMS</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => {
                navigator.clipboard.writeText(phone!.number);
                toast.success("Copied!");
              }}>
                <Copy className="h-4 w-4 mr-2" />
                Copy Number
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onFlag?.(phone!.number, "verified")}>
                <Check className="h-4 w-4 mr-2 text-green-500" />
                Mark Verified
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onFlag?.(phone!.number, "wrong_number")}>
                <AlertTriangle className="h-4 w-4 mr-2 text-orange-500" />
                Wrong Number
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onFlag?.(phone!.number, "dnc")} className="text-red-600">
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

// ============================================
// EMAIL SLOT COMPONENT
// ============================================

interface EmailSlotProps {
  slot: 1 | 2 | 3;
  email: ContactEmail | null;
  onEmail?: (email: string) => void;
  onChange?: (email: ContactEmail | null) => void;
  editable?: boolean;
}

function EmailSlot({ slot, email, onEmail, onChange, editable = false }: EmailSlotProps) {
  const [editValue, setEditValue] = useState("");

  if (!email && !editable) {
    return (
      <div className="flex items-center gap-2 p-2 rounded-lg border border-dashed border-muted-foreground/30 text-muted-foreground text-sm">
        <Mail className="h-4 w-4" />
        <span>Email {slot} - Empty</span>
      </div>
    );
  }

  if (!email && editable) {
    return (
      <div className="flex items-center gap-2 p-2 rounded-lg border border-dashed border-muted-foreground/30">
        <Mail className="h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={`Add email ${slot}`}
          type="email"
          className="h-7 text-sm"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
        />
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7"
          onClick={() => {
            if (editValue && editValue.includes("@")) {
              onChange?.({
                email: editValue,
                type: "personal",
                status: "unverified",
                isPrimary: slot === 1,
              });
              setEditValue("");
            }
          }}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  const statusConfig = EMAIL_STATUS_CONFIG[email!.status];
  const isDisabled = email!.status === "invalid" || email!.status === "bounced";

  return (
    <div className={cn(
      "flex items-center gap-2 p-2 rounded-lg border transition-colors group",
      isDisabled ? "bg-muted/50 opacity-60" : "hover:border-primary/50",
      email!.isPrimary && "border-primary/30 bg-primary/5"
    )}>
      <Badge variant="outline" className={cn(
        "h-6 px-1.5",
        email!.type === "business" ? "bg-blue-500/10 text-blue-600" : "bg-gray-500/10 text-gray-600"
      )}>
        <Mail className="h-3.5 w-3.5" />
      </Badge>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={cn(
            "font-medium truncate text-sm",
            isDisabled && "line-through"
          )}>
            {email!.email}
          </span>
          {email!.isPrimary && <Star className="h-3 w-3 text-yellow-500 fill-yellow-500 flex-shrink-0" />}
        </div>
        <div className="flex items-center gap-1 mt-0.5">
          <span className={cn("text-xs", statusConfig.color)}>{statusConfig.label}</span>
          <span className="text-xs text-muted-foreground">• {email!.type}</span>
        </div>
      </div>

      {!isDisabled && (
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                  onClick={() => onEmail?.(email!.email)}
                >
                  <Mail className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Send Email</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => {
              navigator.clipboard.writeText(email!.email);
              toast.success("Copied!");
            }}
          >
            <Copy className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}

// ============================================
// MAIN OWNER CONTACT CARD COMPONENT
// ============================================

interface OwnerContactCardProps {
  contact: OwnerContact;
  onUpdate?: (contact: OwnerContact) => void;
  onCall?: (phone: string) => void;
  onSMS?: (phone: string) => void;
  onEmail?: (email: string) => void;
  editable?: boolean;
  compact?: boolean;
  className?: string;
}

export function OwnerContactCard({
  contact,
  onUpdate,
  onCall,
  onSMS,
  onEmail,
  editable = false,
  compact = false,
  className,
}: OwnerContactCardProps) {
  const handlePhoneChange = (slot: 1 | 2 | 3, phone: ContactPhone | null) => {
    const updated = { ...contact };
    if (slot === 1) updated.phone1 = phone;
    if (slot === 2) updated.phone2 = phone;
    if (slot === 3) updated.phone3 = phone;
    updated.isLeadReady = !!(updated.phone1 || updated.phone2 || updated.phone3 || updated.email1 || updated.email2 || updated.email3);
    onUpdate?.(updated);
  };

  const handleEmailChange = (slot: 1 | 2 | 3, email: ContactEmail | null) => {
    const updated = { ...contact };
    if (slot === 1) updated.email1 = email;
    if (slot === 2) updated.email2 = email;
    if (slot === 3) updated.email3 = email;
    updated.isLeadReady = !!(updated.phone1 || updated.phone2 || updated.phone3 || updated.email1 || updated.email2 || updated.email3);
    onUpdate?.(updated);
  };

  const handlePhoneFlag = (phone: string, status: PhoneStatus) => {
    const updated = { ...contact };
    [updated.phone1, updated.phone2, updated.phone3].forEach((p, idx) => {
      if (p && p.number === phone) {
        const slot = (idx + 1) as 1 | 2 | 3;
        handlePhoneChange(slot, { ...p, status });
      }
    });
    toast.success(`Phone marked as ${status}`);
  };

  const phoneCount = [contact.phone1, contact.phone2, contact.phone3].filter(Boolean).length;
  const emailCount = [contact.email1, contact.email2, contact.email3].filter(Boolean).length;

  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              {contact.company ? <Building2 className="h-5 w-5 text-primary" /> : <User className="h-5 w-5 text-primary" />}
            </div>
            <div>
              <CardTitle className="text-lg">{contact.name || "Unknown Owner"}</CardTitle>
              {(contact.title || contact.company) && (
                <p className="text-sm text-muted-foreground">
                  {contact.title}{contact.title && contact.company && " at "}{contact.company}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {contact.isLeadReady ? (
              <Badge className="bg-green-600">Lead Ready</Badge>
            ) : (
              <Badge variant="outline" className="text-yellow-600 border-yellow-500/30">Needs Data</Badge>
            )}
            {contact.source === "skip_trace" && (
              <Badge variant="outline" className="text-purple-600 border-purple-500/30">Skip Traced</Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Phone Numbers - 3 Slots */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Phone className="h-4 w-4" />
            Phone Numbers ({phoneCount}/3)
          </h4>
          <div className="space-y-2">
            <PhoneSlot slot={1} phone={contact.phone1} onCall={onCall} onSMS={onSMS} onChange={(p) => handlePhoneChange(1, p)} onFlag={handlePhoneFlag} editable={editable} />
            <PhoneSlot slot={2} phone={contact.phone2} onCall={onCall} onSMS={onSMS} onChange={(p) => handlePhoneChange(2, p)} onFlag={handlePhoneFlag} editable={editable} />
            <PhoneSlot slot={3} phone={contact.phone3} onCall={onCall} onSMS={onSMS} onChange={(p) => handlePhoneChange(3, p)} onFlag={handlePhoneFlag} editable={editable} />
          </div>
        </div>

        {/* Email Addresses - 3 Slots */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Email Addresses ({emailCount}/3)
          </h4>
          <div className="space-y-2">
            <EmailSlot slot={1} email={contact.email1} onEmail={onEmail} onChange={(e) => handleEmailChange(1, e)} editable={editable} />
            <EmailSlot slot={2} email={contact.email2} onEmail={onEmail} onChange={(e) => handleEmailChange(2, e)} editable={editable} />
            <EmailSlot slot={3} email={contact.email3} onEmail={onEmail} onChange={(e) => handleEmailChange(3, e)} editable={editable} />
          </div>
        </div>

        {/* Source/Metadata */}
        {(contact.skipTracedAt || contact.enrichedAt) && (
          <div className="pt-2 border-t text-xs text-muted-foreground">
            {contact.skipTracedAt && <span>Skip traced: {new Date(contact.skipTracedAt).toLocaleDateString()}</span>}
            {contact.enrichedAt && <span className="ml-4">Enriched: {new Date(contact.enrichedAt).toLocaleDateString()}</span>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================
// HELPER: Convert skip trace result to OwnerContact
// ============================================

export function skipTraceToOwnerContact(
  skipTraceResult: {
    ownerName?: string;
    firstName?: string;
    lastName?: string;
    phones?: Array<{ number: string; type?: string; score?: number }>;
    emails?: Array<{ email: string; type?: string }>;
  },
  source: OwnerContact["source"] = "skip_trace"
): OwnerContact {
  const phones = skipTraceResult.phones || [];
  const emails = skipTraceResult.emails || [];

  return {
    name: skipTraceResult.ownerName || `${skipTraceResult.firstName || ""} ${skipTraceResult.lastName || ""}`.trim() || "Unknown",
    firstName: skipTraceResult.firstName,
    lastName: skipTraceResult.lastName,
    source,
    skipTracedAt: new Date().toISOString(),
    isLeadReady: phones.length > 0 || emails.length > 0,

    phone1: phones[0] ? {
      number: phones[0].number,
      lineType: (phones[0].type as PhoneLineType) || "mobile",
      status: (phones[0].score || 0) >= 80 ? "verified" : "unverified",
      isPrimary: true,
      score: phones[0].score,
    } : null,
    phone2: phones[1] ? {
      number: phones[1].number,
      lineType: (phones[1].type as PhoneLineType) || "mobile",
      status: (phones[1].score || 0) >= 80 ? "verified" : "unverified",
      isPrimary: false,
      score: phones[1].score,
    } : null,
    phone3: phones[2] ? {
      number: phones[2].number,
      lineType: (phones[2].type as PhoneLineType) || "mobile",
      status: (phones[2].score || 0) >= 80 ? "verified" : "unverified",
      isPrimary: false,
      score: phones[2].score,
    } : null,

    email1: emails[0] ? {
      email: emails[0].email,
      type: (emails[0].type as "personal" | "business" | "other") || "personal",
      status: "unverified",
      isPrimary: true,
    } : null,
    email2: emails[1] ? {
      email: emails[1].email,
      type: (emails[1].type as "personal" | "business" | "other") || "personal",
      status: "unverified",
      isPrimary: false,
    } : null,
    email3: emails[2] ? {
      email: emails[2].email,
      type: (emails[2].type as "personal" | "business" | "other") || "personal",
      status: "unverified",
      isPrimary: false,
    } : null,
  };
}
