"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Loader2,
  Home,
  MapPin,
  DollarSign,
  TrendingUp,
  Calendar,
  User,
  Phone,
  Mail,
  Building2,
  Landmark,
  FileText,
  RefreshCw,
  Zap,
  MessageSquare,
  PhoneCall,
  MailPlus,
  ExternalLink,
  Copy,
  CheckCircle2,
  AlertTriangle,
  Star,
  Ban,
  Smartphone,
  PhoneForwarded,
  Wifi,
} from "lucide-react";
import { toast } from "sonner";
import {
  OwnerContactCard,
  skipTraceToOwnerContact,
  OwnerContact,
} from "@/components/owner-contact-card";

// Property Detail interface - full payload from RealEstateAPI
interface PropertyDetail {
  id: string;
  // Property Info - can be nested or flat
  propertyInfo?: {
    address?: {
      label?: string;
      address?: string;
      street?: string;
      city?: string;
      state?: string;
      zip?: string;
      county?: string;
      latitude?: number;
      longitude?: number;
      fips?: string;
    };
    propertyType?: string;
    bedrooms?: number;
    bathrooms?: number;
    squareFeet?: number;
    lotSize?: number;
    lotAcres?: number;
    yearBuilt?: number;
    stories?: number;
    pool?: boolean;
    garage?: number;
    garageSpaces?: number;
    zoning?: string;
    subdivision?: string;
    apn?: string;
    livingArea?: number;
    buildingArea?: number;
    basement?: boolean;
    basementSqFt?: number;
    fireplace?: boolean;
    fireplaces?: number;
    heating?: string;
    cooling?: string;
    roofType?: string;
    construction?: string;
    exteriorWalls?: string;
    foundation?: string;
  };
  // Flat address fields (some responses use these)
  address?:
    | string
    | {
        label?: string;
        address?: string;
        street?: string;
        city?: string;
        state?: string;
        zip?: string;
      };
  propertyType?: string;
  bedrooms?: number;
  bathrooms?: number;
  squareFeet?: number;
  sqft?: number;
  lotSize?: number;
  yearBuilt?: number;
  // Owner Info
  ownerInfo?: {
    owner1FirstName?: string;
    owner1LastName?: string;
    owner1FullName?: string;
    owner2FirstName?: string;
    owner2LastName?: string;
    owner2FullName?: string;
    ownerOccupied?: boolean;
    ownerType?: string;
    corporateName?: string;
    trustName?: string;
    mailingAddress?: {
      address?: string;
      street?: string;
      city?: string;
      state?: string;
      zip?: string;
    };
    lengthOfResidence?: number;
    ownershipLength?: number;
  };
  // Flat owner fields
  owner1FirstName?: string;
  owner1LastName?: string;
  ownerFirstName?: string;
  ownerLastName?: string;
  ownerOccupied?: boolean;
  // Valuation - multiple sources
  estimatedValue?: number;
  avm?: number;
  avmValue?: number;
  assessedValue?: number;
  taxAssessedValue?: number;
  taxMarketValue?: number;
  lastSalePrice?: number;
  lastSaleDate?: string;
  lastSaleAmount?: number;
  equity?: number;
  equityPercent?: number;
  equityAmount?: number;
  loanToValue?: number;
  // Mortgage - can be nested or array
  mortgageInfo?: {
    lender?: string;
    loanAmount?: number;
    loanType?: string;
    interestRate?: number;
    loanDate?: string;
    maturityDate?: string;
    dueDate?: string;
    openMortgageBalance?: number;
  };
  mortgages?: Array<{
    lender?: string;
    amount?: number;
    type?: string;
    rate?: number;
    date?: string;
    maturityDate?: string;
  }>;
  openMortgageBalance?: number;
  // Tax Info
  taxInfo?: {
    taxYear?: number;
    taxAmount?: number;
    taxDelinquent?: boolean;
    taxLienAmount?: number;
    taxRate?: number;
    exemptions?: string[];
  };
  taxAmount?: number;
  taxYear?: number;
  // Foreclosure / Distress
  foreclosureInfo?: {
    foreclosureStatus?: string;
    foreclosureDate?: string;
    defaultAmount?: number;
    auctionDate?: string;
    recordingDate?: string;
    documentType?: string;
  };
  preForeclosure?: boolean;
  foreclosure?: boolean;
  reo?: boolean;
  bankOwned?: boolean;
  // Demographics / Market
  demographics?: {
    medianIncome?: number;
    medianAge?: number;
    population?: number;
  };
  // Skip Trace Results (from owner skip trace)
  phones?: string[];
  emails?: string[];
  ownerName?: string;
  mailingAddress?: string;
  skipTracedAt?: string;
  // Lead Signals
  leadTypes?: string[];
  motivatedSeller?: boolean;
  vacantProperty?: boolean;
  highEquity?: boolean;
  absenteeOwner?: boolean;
  // MLS / Listing Info
  mlsStatus?: string;
  listingDate?: string;
  listingPrice?: number;
  daysOnMarket?: number;
  // Raw data (allows any additional fields)
  [key: string]: unknown;
}

// Format currency
function formatCurrency(value?: number): string {
  if (!value) return "-";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

// Format date
function formatDate(date?: string): string {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// Format percentage
function formatPercent(value?: number): string {
  if (!value && value !== 0) return "-";
  return `${Math.round(value)}%`;
}

export default function PropertyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const propertyId = params.id as string;

  const [property, setProperty] = useState<PropertyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [skipTracing, setSkipTracing] = useState(false);
  const [ownerContact, setOwnerContact] = useState<OwnerContact | null>(null);

  // Fetch property detail
  const fetchPropertyDetail = useCallback(
    async (runSkipTrace = true) => {
      setLoading(true);
      try {
        const response = await fetch("/api/property/detail", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: propertyId, autoSkipTrace: runSkipTrace }),
        });

        const data = await response.json();

        if (data.error) {
          toast.error(data.error);
          return;
        }

        const prop = data.property;
        setProperty(prop);

        // Convert skip trace data to OwnerContact format
        if (prop.phones?.length > 0 || prop.emails?.length > 0) {
          const contact = skipTraceToOwnerContact({
            ownerName:
              prop.ownerName ||
              prop.ownerInfo?.owner1FullName ||
              [prop.ownerInfo?.owner1FirstName, prop.ownerInfo?.owner1LastName]
                .filter(Boolean)
                .join(" "),
            phones:
              prop.phones?.map((p: string, idx: number) => ({
                number: p,
                type: idx === 0 ? "mobile" : "landline",
              })) || [],
            emails:
              prop.emails?.map((e: string, idx: number) => ({
                email: e,
                type: idx === 0 ? "personal" : "work",
              })) || [],
          });
          setOwnerContact(contact);
        }

        toast.success(
          "Property detail loaded" + (runSkipTrace ? " with skip trace" : ""),
        );
      } catch (error) {
        console.error("Failed to fetch property:", error);
        toast.error("Failed to load property detail");
      } finally {
        setLoading(false);
      }
    },
    [propertyId],
  );

  // Run skip trace separately
  const runSkipTrace = useCallback(async () => {
    if (!property) return;

    setSkipTracing(true);
    try {
      const ownerInfo = property.ownerInfo || {};
      const propAddress = property.propertyInfo?.address;

      const response = await fetch("/api/skip-trace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: ownerInfo.owner1FirstName,
          lastName: ownerInfo.owner1LastName,
          address: propAddress?.address || propAddress?.street,
          city: propAddress?.city,
          state: propAddress?.state,
          zip: propAddress?.zip,
        }),
      });

      const data = await response.json();

      if (data.error) {
        toast.error(data.error);
        return;
      }

      // Update property with skip trace results
      setProperty((prev) =>
        prev
          ? {
              ...prev,
              phones:
                data.phones?.map((p: { number?: string } | string) =>
                  typeof p === "string" ? p : p.number,
                ) || [],
              emails:
                data.emails?.map((e: { email?: string } | string) =>
                  typeof e === "string" ? e : e.email,
                ) || [],
              ownerName: data.ownerName || prev.ownerName,
              skipTracedAt: new Date().toISOString(),
            }
          : null,
      );

      // Update owner contact
      if (data.phones?.length > 0 || data.emails?.length > 0) {
        setOwnerContact(skipTraceToOwnerContact(data));
      }

      toast.success(
        `Skip trace complete: ${data.phones?.length || 0} phones, ${data.emails?.length || 0} emails`,
      );
    } catch (error) {
      console.error("Skip trace failed:", error);
      toast.error("Skip trace failed");
    } finally {
      setSkipTracing(false);
    }
  }, [property]);

  // Initial load
  useEffect(() => {
    if (propertyId) {
      fetchPropertyDetail(true);
    }
  }, [propertyId, fetchPropertyDetail]);

  // Copy to clipboard
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  };

  // Push to Valuation page
  const pushToValuation = () => {
    if (!property) return;
    const addr = property.propertyInfo?.address;
    const address =
      addr?.label ||
      `${addr?.address}, ${addr?.city}, ${addr?.state} ${addr?.zip}`;

    localStorage.setItem(
      "nextier_valuation_property",
      JSON.stringify({
        address,
        propertyId: property.id,
        ownerName: property.ownerName,
        phones: property.phones,
        emails: property.emails,
        estimatedValue: property.estimatedValue,
        propertyDetail: property,
      }),
    );

    router.push(`/t/default/valuation?address=${encodeURIComponent(address)}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading property detail...</p>
        </div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertTriangle className="h-8 w-8 mx-auto mb-4 text-orange-500" />
          <p className="text-muted-foreground">Property not found</p>
          <Button
            variant="outline"
            onClick={() => router.back()}
            className="mt-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  const addr = property.propertyInfo?.address;
  const owner = property.ownerInfo;
  const mortgage = property.mortgageInfo;
  const tax = property.taxInfo;
  const foreclosure = property.foreclosureInfo;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card sticky top-0 z-10">
        <div className="container max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => router.back()}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-xl font-bold">
                  {addr?.address || addr?.label || "Property Detail"}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {addr?.city}, {addr?.state} {addr?.zip}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => fetchPropertyDetail(false)}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button
                variant="outline"
                onClick={runSkipTrace}
                disabled={skipTracing}
              >
                {skipTracing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <User className="h-4 w-4 mr-2" />
                )}
                Skip Trace Owner
              </Button>
              <Button
                className="bg-gradient-to-r from-purple-600 to-blue-600"
                onClick={pushToValuation}
              >
                <Zap className="h-4 w-4 mr-2" />
                Full Valuation
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Property Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Property Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Home className="h-5 w-5" />
                  Property Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Type</p>
                    <p className="font-semibold">
                      {property.propertyInfo?.propertyType || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Beds</p>
                    <p className="font-semibold">
                      {property.propertyInfo?.bedrooms || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Baths</p>
                    <p className="font-semibold">
                      {property.propertyInfo?.bathrooms || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Sq Ft</p>
                    <p className="font-semibold">
                      {sf(property.propertyInfo?.squareFeet) || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Year Built</p>
                    <p className="font-semibold">
                      {property.propertyInfo?.yearBuilt || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Lot Size</p>
                    <p className="font-semibold">
                      {sf(property.propertyInfo?.lotSize) || "-"} sqft
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Stories</p>
                    <p className="font-semibold">
                      {property.propertyInfo?.stories || "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">APN</p>
                    <p className="font-semibold text-xs">
                      {property.propertyInfo?.apn || "-"}
                    </p>
                  </div>
                </div>

                <Separator className="my-4" />

                {/* Lead Signals */}
                {property.leadTypes && property.leadTypes.length > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">
                      Lead Signals
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {property.leadTypes.map((type) => (
                        <Badge key={type} variant="secondary">
                          {type.replace(/_/g, " ")}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Valuation */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Valuation & Equity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                    <p className="text-sm text-green-600">Estimated Value</p>
                    <p className="text-2xl font-bold text-green-600">
                      {formatCurrency(
                        property.estimatedValue || property.taxMarketValue,
                      )}
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                    <p className="text-sm text-blue-600">Equity</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {formatCurrency(property.equity)}
                    </p>
                    <p className="text-xs text-blue-600">
                      {formatPercent(property.equityPercent)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Last Sale Price
                    </p>
                    <p className="font-semibold">
                      {formatCurrency(property.lastSalePrice)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(property.lastSaleDate)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Assessed Value
                    </p>
                    <p className="font-semibold">
                      {formatCurrency(
                        property.assessedValue || property.taxAssessedValue,
                      )}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Mortgage Info */}
            {mortgage && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Landmark className="h-5 w-5" />
                    Mortgage Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Lender</p>
                      <p className="font-semibold">{mortgage.lender || "-"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Loan Amount
                      </p>
                      <p className="font-semibold">
                        {formatCurrency(mortgage.loanAmount)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Loan Type</p>
                      <p className="font-semibold">
                        {mortgage.loanType || "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Interest Rate
                      </p>
                      <p className="font-semibold">
                        {mortgage.interestRate
                          ? `${mortgage.interestRate}%`
                          : "-"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Loan Date</p>
                      <p className="font-semibold">
                        {formatDate(mortgage.loanDate)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">
                        Maturity Date
                      </p>
                      <p className="font-semibold">
                        {formatDate(mortgage.maturityDate)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Tax & Foreclosure */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {tax && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Tax Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Tax Year</span>
                        <span className="font-semibold">
                          {tax.taxYear || "-"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Tax Amount
                        </span>
                        <span className="font-semibold">
                          {formatCurrency(tax.taxAmount)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Tax Delinquent
                        </span>
                        <span
                          className={
                            tax.taxDelinquent
                              ? "text-red-500 font-semibold"
                              : ""
                          }
                        >
                          {tax.taxDelinquent ? "Yes" : "No"}
                        </span>
                      </div>
                      {tax.taxLienAmount && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">
                            Lien Amount
                          </span>
                          <span className="text-red-500 font-semibold">
                            {formatCurrency(tax.taxLienAmount)}
                          </span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {foreclosure && foreclosure.foreclosureStatus && (
                <Card className="border-red-500/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-red-500">
                      <AlertTriangle className="h-5 w-5" />
                      Foreclosure Info
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Status</span>
                        <Badge variant="destructive">
                          {foreclosure.foreclosureStatus}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Filing Date
                        </span>
                        <span className="font-semibold">
                          {formatDate(foreclosure.foreclosureDate)}
                        </span>
                      </div>
                      {foreclosure.defaultAmount && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">
                            Default Amount
                          </span>
                          <span className="text-red-500 font-semibold">
                            {formatCurrency(foreclosure.defaultAmount)}
                          </span>
                        </div>
                      )}
                      {foreclosure.auctionDate && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">
                            Auction Date
                          </span>
                          <span className="text-red-500 font-semibold">
                            {formatDate(foreclosure.auctionDate)}
                          </span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Right Column - Owner Info & Contact */}
          <div className="space-y-6">
            {/* Owner Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Owner Information
                </CardTitle>
                {property.skipTracedAt && (
                  <CardDescription className="flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                    Skip traced {formatDate(property.skipTracedAt)}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Owner Name */}
                <div>
                  <p className="text-sm text-muted-foreground">Owner 1</p>
                  <p className="font-semibold text-lg">
                    {property.ownerName ||
                      owner?.owner1FullName ||
                      [owner?.owner1FirstName, owner?.owner1LastName]
                        .filter(Boolean)
                        .join(" ") ||
                      "-"}
                  </p>
                </div>

                {owner?.owner2FullName && (
                  <div>
                    <p className="text-sm text-muted-foreground">Owner 2</p>
                    <p className="font-semibold">
                      {owner.owner2FullName ||
                        [owner.owner2FirstName, owner.owner2LastName]
                          .filter(Boolean)
                          .join(" ")}
                    </p>
                  </div>
                )}

                {/* Owner Type */}
                <div className="flex gap-2">
                  <Badge
                    variant={owner?.ownerOccupied ? "default" : "secondary"}
                  >
                    {owner?.ownerOccupied ? "Owner Occupied" : "Absentee Owner"}
                  </Badge>
                  {owner?.ownerType && (
                    <Badge variant="outline">{owner.ownerType}</Badge>
                  )}
                </div>

                {/* Mailing Address */}
                {owner?.mailingAddress && (
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Mailing Address
                    </p>
                    <p className="font-medium">
                      {owner.mailingAddress.address}
                      <br />
                      {owner.mailingAddress.city}, {owner.mailingAddress.state}{" "}
                      {owner.mailingAddress.zip}
                    </p>
                  </div>
                )}

                <Separator />

                {/* Skip Trace Status */}
                {!property.phones?.length && !property.emails?.length ? (
                  <div className="text-center py-4">
                    <p className="text-muted-foreground mb-2">
                      No contact info found
                    </p>
                    <Button onClick={runSkipTrace} disabled={skipTracing}>
                      {skipTracing ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <User className="h-4 w-4 mr-2" />
                      )}
                      Run Skip Trace
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-green-600 flex items-center gap-1">
                      <CheckCircle2 className="h-4 w-4" />
                      Contact Info Found
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Owner Contact Card (with 3 phone + 3 email slots) */}
            {ownerContact && (
              <OwnerContactCard
                contact={ownerContact}
                onCall={(phone) => (window.location.href = `tel:${phone}`)}
                onSMS={(phone) => window.open(`sms:${phone}`, "_blank")}
                onEmail={(email) => (window.location.href = `mailto:${email}`)}
                editable={false}
              />
            )}

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  className="w-full justify-start"
                  variant="outline"
                  disabled={!property.phones?.length}
                  onClick={() =>
                    property.phones?.[0] &&
                    (window.location.href = `tel:${property.phones[0]}`)
                  }
                >
                  <PhoneCall className="h-4 w-4 mr-2 text-blue-500" />
                  Call Owner
                </Button>
                <Button
                  className="w-full justify-start"
                  variant="outline"
                  disabled={!property.phones?.length}
                  onClick={() =>
                    property.phones?.[0] &&
                    window.open(`sms:${property.phones[0]}`, "_blank")
                  }
                >
                  <MessageSquare className="h-4 w-4 mr-2 text-green-500" />
                  Send SMS
                </Button>
                <Button
                  className="w-full justify-start"
                  variant="outline"
                  disabled={!property.emails?.length}
                  onClick={() =>
                    property.emails?.[0] &&
                    (window.location.href = `mailto:${property.emails[0]}`)
                  }
                >
                  <MailPlus className="h-4 w-4 mr-2 text-purple-500" />
                  Send Email
                </Button>
                <Separator />
                <Button
                  className="w-full justify-start bg-gradient-to-r from-purple-600 to-blue-600 text-white"
                  onClick={pushToValuation}
                >
                  <Zap className="h-4 w-4 mr-2" />
                  Full Valuation Report
                </Button>
              </CardContent>
            </Card>

            {/* Property ID */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Property ID</CardTitle>
              </CardHeader>
              <CardContent>
                <code className="text-xs bg-muted p-2 rounded block break-all">
                  {property.id}
                </code>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2"
                  onClick={() => copyToClipboard(property.id, "Property ID")}
                >
                  <Copy className="h-3 w-3 mr-1" />
                  Copy ID
                </Button>
              </CardContent>
            </Card>

            {/* Raw API Data - Debug */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Raw API Data
                </CardTitle>
                <CardDescription>All fields from RealEstateAPI</CardDescription>
              </CardHeader>
              <CardContent>
                <details>
                  <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                    Click to expand raw data
                  </summary>
                  <pre className="text-xs bg-muted p-3 rounded mt-2 overflow-auto max-h-96">
                    {JSON.stringify(property, null, 2)}
                  </pre>
                </details>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2"
                  onClick={() =>
                    copyToClipboard(
                      JSON.stringify(property, null, 2),
                      "Raw data",
                    )
                  }
                >
                  <Copy className="h-3 w-3 mr-1" />
                  Copy JSON
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
