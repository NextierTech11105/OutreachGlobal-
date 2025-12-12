"use client";

import * as React from "react";
import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  OwnerContactCard,
  OwnerContact,
  skipTraceToOwnerContact,
} from "@/components/owner-contact-card";
import {
  MapPin,
  Building,
  Home,
  DollarSign,
  Calendar,
  User,
  Briefcase,
  Phone,
  MessageSquare,
  Mail,
  Zap,
  Target,
  Loader2,
  AlertCircle,
  CheckCircle,
  Plus,
  Send,
  RefreshCw,
  Users,
  TrendingUp,
  FileText,
  Scale,
  Gavel,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// ============================================
// TYPES
// ============================================

export type RecordType =
  | "property"
  | "lis-pendens"
  | "foreclosure"
  | "b2b-company"
  | "b2b-contact"
  | "lead"
  | "generic";

export interface UniversalDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record: any;
  recordType?: RecordType; // Optional hint, otherwise auto-detect
  onAction?: (action: string, data: any) => void;
}

// ============================================
// CONTEXT DETECTION
// ============================================

function detectRecordType(record: any): RecordType {
  if (!record) return "generic";

  // Lis Pendens - has case number and plaintiff
  if (record.caseNumber && record.plaintiff) return "lis-pendens";

  // Foreclosure - has auction date or default amount
  if (record.auctionDate || record.defaultAmount) return "foreclosure";

  // Property - has property type, beds, or is clearly real estate
  if (
    record.propertyType ||
    record.beds ||
    record.baths ||
    record.estimatedValue
  )
    return "property";

  // B2B Company - has company with industry/employees
  if (record.company && (record.industry || record.employees || record.revenue))
    return "b2b-company";

  // B2B Contact - has title with company or LinkedIn
  if (record.title && (record.company || record.linkedIn || record.seniority))
    return "b2b-contact";

  // Lead - has lead status or source
  if (record.leadStatus || record.leadScore || record.source) return "lead";

  return "generic";
}

function getRecordTypeConfig(type: RecordType) {
  const configs: Record<
    RecordType,
    {
      label: string;
      color: string;
      icon: React.ElementType;
      enrichLabel: string;
      enrichApi: string;
    }
  > = {
    property: {
      label: "Property",
      color: "bg-green-500",
      icon: Home,
      enrichLabel: "Skip Trace",
      enrichApi: "/api/skip-trace",
    },
    "lis-pendens": {
      label: "Lis Pendens",
      color: "bg-orange-500",
      icon: Gavel,
      enrichLabel: "Skip Trace",
      enrichApi: "/api/skip-trace",
    },
    foreclosure: {
      label: "Foreclosure",
      color: "bg-red-500",
      icon: Scale,
      enrichLabel: "Skip Trace",
      enrichApi: "/api/skip-trace",
    },
    "b2b-company": {
      label: "B2B Company",
      color: "bg-blue-500",
      icon: Building,
      enrichLabel: "Find Contacts",
      enrichApi: "/api/apollo/enrich",
    },
    "b2b-contact": {
      label: "B2B Contact",
      color: "bg-purple-500",
      icon: Briefcase,
      enrichLabel: "Enrich",
      enrichApi: "/api/apollo/enrich",
    },
    lead: {
      label: "Lead",
      color: "bg-cyan-500",
      icon: Target,
      enrichLabel: "Re-enrich",
      enrichApi: "/api/enrichment",
    },
    generic: {
      label: "Record",
      color: "bg-zinc-500",
      icon: FileText,
      enrichLabel: "Enrich",
      enrichApi: "/api/enrichment",
    },
  };
  return configs[type];
}

// ============================================
// FIELD GRID COMPONENT
// ============================================

interface FieldGridProps {
  fields: Array<{
    label: string;
    value: any;
    icon?: React.ElementType;
    format?: "currency" | "date" | "percent" | "number";
  }>;
}

function FieldGrid({ fields }: FieldGridProps) {
  const formatValue = (value: any, format?: string) => {
    if (value === null || value === undefined || value === "") return "—";

    switch (format) {
      case "currency":
        return new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
          maximumFractionDigits: 0,
        }).format(value);
      case "date":
        return new Date(value).toLocaleDateString();
      case "percent":
        return `${value}%`;
      case "number":
        return new Intl.NumberFormat("en-US").format(value);
      default:
        return String(value);
    }
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {fields.map((field, idx) => {
        const Icon = field.icon;
        return (
          <div
            key={idx}
            className="p-3 rounded-lg bg-zinc-800/50 border border-zinc-700/50"
          >
            <div className="flex items-center gap-2 mb-1">
              {Icon && <Icon className="h-3.5 w-3.5 text-zinc-500" />}
              <span className="text-xs text-zinc-500 uppercase tracking-wide">
                {field.label}
              </span>
            </div>
            <div className="font-medium text-zinc-100 truncate">
              {formatValue(field.value, field.format)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ============================================
// CONTEXT-SPECIFIC FIELD RENDERERS
// ============================================

function PropertyFields({ record }: { record: any }) {
  const fields = [
    {
      label: "Property Type",
      value: record.propertyType || record.property_type,
      icon: Home,
    },
    { label: "Beds", value: record.beds || record.bedrooms, icon: Home },
    { label: "Baths", value: record.baths || record.bathrooms, icon: Home },
    {
      label: "Sqft",
      value: record.sqft || record.square_footage,
      format: "number" as const,
    },
    {
      label: "Year Built",
      value: record.yearBuilt || record.year_built,
      icon: Calendar,
    },
    { label: "Lot Size", value: record.lotSize || record.lot_size },
    {
      label: "Est. Value",
      value: record.estimatedValue || record.estimated_value,
      format: "currency" as const,
      icon: DollarSign,
    },
    {
      label: "Equity",
      value: record.equity,
      format: "currency" as const,
      icon: TrendingUp,
    },
  ].filter((f) => f.value !== undefined && f.value !== null && f.value !== "");

  return <FieldGrid fields={fields} />;
}

function LisPendensFields({ record }: { record: any }) {
  const fields = [
    {
      label: "Case Number",
      value: record.caseNumber || record.case_number,
      icon: FileText,
    },
    {
      label: "Filed Date",
      value: record.filedDate || record.filed_date,
      format: "date" as const,
      icon: Calendar,
    },
    { label: "Plaintiff", value: record.plaintiff, icon: Building },
    { label: "Defendant", value: record.defendant, icon: User },
    { label: "County", value: record.county },
    { label: "Court", value: record.court },
    {
      label: "Property Type",
      value: record.propertyType || record.property_type,
      icon: Home,
    },
    {
      label: "Assessed Value",
      value:
        record.assessedValue || record.assessed_value || record.estimatedValue,
      format: "currency" as const,
      icon: DollarSign,
    },
  ].filter((f) => f.value !== undefined && f.value !== null && f.value !== "");

  return <FieldGrid fields={fields} />;
}

function ForeclosureFields({ record }: { record: any }) {
  const fields = [
    {
      label: "Auction Date",
      value: record.auctionDate || record.auction_date,
      format: "date" as const,
      icon: Calendar,
    },
    {
      label: "Default Amount",
      value: record.defaultAmount || record.default_amount,
      format: "currency" as const,
      icon: DollarSign,
    },
    { label: "Lender", value: record.lender, icon: Building },
    { label: "LTV", value: record.ltv, format: "percent" as const },
    {
      label: "Property Type",
      value: record.propertyType || record.property_type,
      icon: Home,
    },
    {
      label: "Est. Value",
      value: record.estimatedValue || record.estimated_value,
      format: "currency" as const,
      icon: DollarSign,
    },
    {
      label: "Equity",
      value: record.equity,
      format: "currency" as const,
      icon: TrendingUp,
    },
    { label: "Status", value: record.foreclosureStatus || record.status },
  ].filter((f) => f.value !== undefined && f.value !== null && f.value !== "");

  return <FieldGrid fields={fields} />;
}

function B2BCompanyFields({ record }: { record: any }) {
  const fields = [
    { label: "Company", value: record.company || record.name, icon: Building },
    { label: "Industry", value: record.industry, icon: Briefcase },
    {
      label: "Revenue",
      value: record.revenue || record.annual_revenue,
      format: "currency" as const,
      icon: DollarSign,
    },
    {
      label: "Employees",
      value: record.employees || record.employee_count,
      format: "number" as const,
      icon: Users,
    },
    { label: "Founded", value: record.founded || record.year_founded },
    {
      label: "HQ Location",
      value: record.headquarters || record.location,
      icon: MapPin,
    },
    { label: "Website", value: record.website },
    {
      label: "LinkedIn",
      value: record.linkedIn || record.linkedin_url ? "View" : undefined,
    },
  ].filter((f) => f.value !== undefined && f.value !== null && f.value !== "");

  return <FieldGrid fields={fields} />;
}

function B2BContactFields({ record }: { record: any }) {
  const fullName =
    record.name || `${record.firstName || ""} ${record.lastName || ""}`.trim();
  const fields = [
    { label: "Name", value: fullName, icon: User },
    { label: "Title", value: record.title, icon: Briefcase },
    { label: "Company", value: record.company, icon: Building },
    { label: "Seniority", value: record.seniority },
    { label: "Department", value: record.department },
    { label: "Location", value: record.location || record.city, icon: MapPin },
    {
      label: "LinkedIn",
      value: record.linkedIn || record.linkedin_url ? "View" : undefined,
    },
    { label: "Email", value: record.email, icon: Mail },
  ].filter((f) => f.value !== undefined && f.value !== null && f.value !== "");

  return <FieldGrid fields={fields} />;
}

function LeadFields({ record }: { record: any }) {
  const fields = [
    { label: "Status", value: record.leadStatus || record.status },
    { label: "Score", value: record.leadScore || record.score },
    { label: "Source", value: record.source },
    {
      label: "Created",
      value: record.createdAt || record.created_at,
      format: "date" as const,
      icon: Calendar,
    },
    {
      label: "Last Activity",
      value: record.lastActivityAt || record.last_activity,
      format: "date" as const,
    },
    { label: "Owner", value: record.ownerName || record.owner },
    {
      label: "Tags",
      value: Array.isArray(record.tags) ? record.tags.join(", ") : record.tags,
    },
    { label: "Campaign", value: record.campaignName || record.campaign },
  ].filter((f) => f.value !== undefined && f.value !== null && f.value !== "");

  return <FieldGrid fields={fields} />;
}

// ============================================
// MAIN COMPONENT
// ============================================

export function UniversalDetailModal({
  open,
  onOpenChange,
  record,
  recordType: recordTypeHint,
  onAction,
}: UniversalDetailModalProps) {
  const [isEnriching, setIsEnriching] = useState(false);
  const [contact, setContact] = useState<OwnerContact | null>(null);
  const [enrichError, setEnrichError] = useState<string | null>(null);

  // Detect record type
  const recordType = recordTypeHint || detectRecordType(record);
  const config = getRecordTypeConfig(recordType);
  const TypeIcon = config.icon;

  // Build title from record
  const getTitle = useCallback(() => {
    if (!record) return "Details";

    // Address-based
    if (record.address) {
      const parts = [record.address];
      if (record.city) parts.push(record.city);
      if (record.state) parts.push(record.state);
      return parts.join(", ");
    }

    // Company name
    if (record.company && !record.title) return record.company;

    // Person name
    if (record.name) return record.name;
    if (record.firstName || record.lastName) {
      return `${record.firstName || ""} ${record.lastName || ""}`.trim();
    }

    // Case number for lis pendens
    if (record.caseNumber) return `Case #${record.caseNumber}`;

    return "Record Details";
  }, [record]);

  // Check if we have contact data
  const hasContactData = useCallback(() => {
    if (contact && contact.isLeadReady) return true;
    if (record?.ownerPhone || record?.phone) return true;
    if (record?.ownerEmail || record?.email) return true;
    return false;
  }, [contact, record]);

  // Initialize contact from record if available
  useEffect(() => {
    if (!record) return;

    // Check if record already has contact data
    if (record.ownerName || record.ownerPhone || record.phone) {
      const existingContact: OwnerContact = {
        name: record.ownerName || record.name || record.defendant || "Unknown",
        firstName: record.firstName || record.owner_first_name,
        lastName: record.lastName || record.owner_last_name,
        title: record.title,
        company: record.company,
        source: "enrichment",
        isLeadReady: !!(
          record.ownerPhone ||
          record.phone ||
          record.ownerEmail ||
          record.email
        ),
        phone1:
          record.ownerPhone || record.phone
            ? {
                number: record.ownerPhone || record.phone,
                lineType: "mobile",
                status: "unverified",
                isPrimary: true,
              }
            : null,
        phone2: record.phone2
          ? {
              number: record.phone2,
              lineType: "mobile",
              status: "unverified",
              isPrimary: false,
            }
          : null,
        phone3: null,
        email1:
          record.ownerEmail || record.email
            ? {
                email: record.ownerEmail || record.email,
                type: "personal",
                status: "unverified",
                isPrimary: true,
              }
            : null,
        email2: record.email2
          ? {
              email: record.email2,
              type: "personal",
              status: "unverified",
              isPrimary: false,
            }
          : null,
        email3: null,
      };
      setContact(existingContact);
    }
  }, [record]);

  // Enrich handler
  const handleEnrich = async () => {
    setIsEnriching(true);
    setEnrichError(null);

    try {
      let enrichResult;

      if (recordType === "b2b-company" || recordType === "b2b-contact") {
        // Apollo enrichment
        const response = await fetch("/api/apollo/enrich", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            company: record.company,
            domain: record.domain || record.website,
            firstName: record.firstName,
            lastName: record.lastName,
            email: record.email,
          }),
        });
        enrichResult = await response.json();
      } else {
        // Skip trace for property/lis pendens/foreclosure
        const response = await fetch("/api/skip-trace", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            firstName:
              record.ownerFirstName ||
              record.owner_first_name ||
              record.defendant?.split(" ")[0],
            lastName:
              record.ownerLastName ||
              record.owner_last_name ||
              record.defendant?.split(" ").slice(1).join(" "),
            address: record.address,
            city: record.city,
            state: record.state,
            zip: record.zip || record.zipCode,
          }),
        });
        enrichResult = await response.json();
      }

      if (enrichResult.error) {
        setEnrichError(enrichResult.error);
        toast.error(enrichResult.error);
      } else {
        // Convert to OwnerContact format
        const newContact = skipTraceToOwnerContact(
          {
            ownerName: enrichResult.ownerName || enrichResult.name,
            firstName: enrichResult.firstName,
            lastName: enrichResult.lastName,
            phones:
              enrichResult.phones ||
              (enrichResult.phone ? [{ number: enrichResult.phone }] : []),
            emails:
              enrichResult.emails ||
              (enrichResult.email ? [{ email: enrichResult.email }] : []),
          },
          recordType.includes("b2b") ? "apollo" : "skip_trace",
        );

        setContact(newContact);
        toast.success(
          `Found ${[newContact.phone1, newContact.phone2, newContact.phone3].filter(Boolean).length} phones, ${[newContact.email1, newContact.email2, newContact.email3].filter(Boolean).length} emails`,
        );
      }
    } catch (err: any) {
      setEnrichError(err.message || "Enrichment failed");
      toast.error("Enrichment failed");
    } finally {
      setIsEnriching(false);
    }
  };

  // Action handlers
  const handleCall = (phone: string) => {
    onAction?.("call", { phone, record });
    window.open(`tel:${phone}`, "_self");
  };

  const handleSMS = (phone: string) => {
    onAction?.("sms", { phone, record });
    // Could open SMS composer or queue to SignalHouse
    toast.info("Opening SMS...");
  };

  const handleEmail = (email: string) => {
    onAction?.("email", { email, record });
    window.open(`mailto:${email}`, "_blank");
  };

  const handleAddLead = () => {
    onAction?.("add-lead", { record, contact });
    toast.success("Adding to leads...");
  };

  const handleAddToCampaign = (
    campaignType: "initial" | "retarget" | "nurture",
  ) => {
    onAction?.("add-campaign", { record, contact, campaignType });
    toast.success(`Adding to ${campaignType} campaign...`);
  };

  const handleSaveToBucket = () => {
    onAction?.("save-bucket", { record });
    toast.success("Saving to bucket...");
  };

  // Render context-specific fields
  const renderFields = () => {
    switch (recordType) {
      case "property":
        return <PropertyFields record={record} />;
      case "lis-pendens":
        return <LisPendensFields record={record} />;
      case "foreclosure":
        return <ForeclosureFields record={record} />;
      case "b2b-company":
        return <B2BCompanyFields record={record} />;
      case "b2b-contact":
        return <B2BContactFields record={record} />;
      case "lead":
        return <LeadFields record={record} />;
      default:
        return <PropertyFields record={record} />;
    }
  };

  if (!record) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0 bg-zinc-900 border-zinc-800 text-zinc-100">
        {/* Header */}
        <DialogHeader className="p-6 pb-4 border-b border-zinc-800">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <Badge className={cn("text-white text-xs", config.color)}>
                  <TypeIcon className="h-3 w-3 mr-1" />
                  {config.label}
                </Badge>
                {hasContactData() && (
                  <Badge className="bg-green-600 text-white text-xs">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Ready
                  </Badge>
                )}
              </div>
              <DialogTitle className="text-xl font-semibold text-zinc-100 truncate">
                {getTitle()}
              </DialogTitle>
              {record.caseNumber && recordType !== "lis-pendens" && (
                <p className="text-sm text-zinc-500 mt-1">
                  Case #{record.caseNumber}
                </p>
              )}
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 max-h-[60vh]">
          <div className="p-6 space-y-6">
            {/* Details Section */}
            <div>
              <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wide mb-3 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Details
              </h3>
              {renderFields()}
            </div>

            <Separator className="bg-zinc-800" />

            {/* Contacts Section */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wide flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Contacts
                </h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleEnrich}
                  disabled={isEnriching}
                  className="bg-zinc-800 border-zinc-700 hover:bg-zinc-700"
                >
                  {isEnriching ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Enriching...
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4 mr-2" />
                      {config.enrichLabel}
                    </>
                  )}
                </Button>
              </div>

              {enrichError && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm mb-4 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  {enrichError}
                </div>
              )}

              {contact ? (
                <OwnerContactCard
                  contact={contact}
                  onCall={handleCall}
                  onSMS={handleSMS}
                  onEmail={handleEmail}
                  onUpdate={setContact}
                  className="bg-zinc-800/50 border-zinc-700"
                />
              ) : (
                <div className="p-8 rounded-lg border border-dashed border-zinc-700 text-center">
                  <User className="h-8 w-8 mx-auto mb-3 text-zinc-600" />
                  <p className="text-zinc-500 mb-4">
                    No contact data available
                  </p>
                  <Button
                    variant="outline"
                    onClick={handleEnrich}
                    disabled={isEnriching}
                    className="bg-zinc-800 border-zinc-700"
                  >
                    <Zap className="h-4 w-4 mr-2" />
                    {config.enrichLabel}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </ScrollArea>

        {/* Actions Footer */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-900/50">
          <div className="flex flex-wrap gap-2">
            {/* Quick Contact Actions */}
            {contact?.phone1 && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleCall(contact.phone1!.number)}
                  className="bg-green-500/10 border-green-500/30 text-green-400 hover:bg-green-500/20"
                >
                  <Phone className="h-4 w-4 mr-2" />
                  Call
                </Button>
                {contact.phone1.lineType === "mobile" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSMS(contact.phone1!.number)}
                    className="bg-blue-500/10 border-blue-500/30 text-blue-400 hover:bg-blue-500/20"
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    SMS
                  </Button>
                )}
              </>
            )}
            {contact?.email1 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleEmail(contact.email1!.email)}
                className="bg-purple-500/10 border-purple-500/30 text-purple-400 hover:bg-purple-500/20"
              >
                <Mail className="h-4 w-4 mr-2" />
                Email
              </Button>
            )}

            <Separator orientation="vertical" className="h-8 bg-zinc-700" />

            {/* Campaign Actions */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleAddToCampaign("initial")}
              className="bg-zinc-800 border-zinc-700 hover:bg-zinc-700"
            >
              <Send className="h-4 w-4 mr-2" />
              Initial
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleAddToCampaign("retarget")}
              className="bg-zinc-800 border-zinc-700 hover:bg-zinc-700"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retarget
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleAddToCampaign("nurture")}
              className="bg-zinc-800 border-zinc-700 hover:bg-zinc-700"
            >
              <Target className="h-4 w-4 mr-2" />
              Nurture
            </Button>

            <Separator orientation="vertical" className="h-8 bg-zinc-700" />

            {/* Other Actions */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleAddLead}
              className="bg-zinc-800 border-zinc-700 hover:bg-zinc-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Lead
            </Button>
            {(recordType === "property" ||
              recordType === "lis-pendens" ||
              recordType === "foreclosure") && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleSaveToBucket}
                className="bg-zinc-800 border-zinc-700 hover:bg-zinc-700"
              >
                <FileText className="h-4 w-4 mr-2" />
                Save Bucket
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export { detectRecordType, getRecordTypeConfig };
export type { RecordType };
