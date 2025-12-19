"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  User,
  Phone,
  Mail,
  MapPin,
  Building2,
  DollarSign,
  Calendar,
  Eye,
  Share2,
  AlertTriangle,
  Home,
  FileText,
  ExternalLink,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";

interface ShareData {
  share: {
    token: string;
    resourceType: string;
    resourceId: string;
    isPublic: boolean;
    viewCount: number;
    createdAt: string;
    expiresAt: string | null;
  };
  data: Record<string, any> | null;
}

export default function ShareViewPage() {
  const params = useParams();
  const token = params.token as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shareData, setShareData] = useState<ShareData | null>(null);

  useEffect(() => {
    const fetchShareData = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/share/${token}`);
        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "Failed to load shared content");
          return;
        }

        setShareData(data);
      } catch (err) {
        setError("Failed to load shared content");
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchShareData();
    }
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-zinc-400">Loading shared content...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <Card className="max-w-md w-full bg-zinc-900 border-zinc-800">
          <CardHeader className="text-center">
            <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
            <CardTitle className="text-zinc-100">
              Unable to Load Content
            </CardTitle>
            <CardDescription className="text-zinc-400">{error}</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Link href="/">
              <Button variant="outline">Go to Homepage</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!shareData || !shareData.data) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <Card className="max-w-md w-full bg-zinc-900 border-zinc-800">
          <CardHeader className="text-center">
            <AlertTriangle className="h-12 w-12 text-zinc-500 mx-auto mb-4" />
            <CardTitle className="text-zinc-100">Content Not Found</CardTitle>
            <CardDescription className="text-zinc-400">
              This shared content may have been removed or the link is invalid.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const { share, data } = shareData;

  // Render based on resource type
  const renderContent = () => {
    switch (share.resourceType) {
      case "lead":
        return <LeadView data={data} />;
      case "valuation_report":
        return <ValuationReportView data={data} />;
      case "property":
        return <PropertyView data={data} />;
      default:
        return <GenericView data={data} resourceType={share.resourceType} />;
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Share2 className="h-5 w-5 text-blue-400" />
            <span className="font-semibold">Shared Content</span>
            <Badge variant="outline" className="text-xs">
              {share.resourceType.replace("_", " ")}
            </Badge>
          </div>
          <div className="flex items-center gap-4 text-sm text-zinc-400">
            <span className="flex items-center gap-1">
              <Eye className="h-4 w-4" />
              {share.viewCount} views
            </span>
            {share.expiresAt && (
              <span className="text-amber-400">
                Expires: {new Date(share.expiresAt).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-5xl mx-auto px-4 py-8">{renderContent()}</main>

      {/* Footer */}
      <footer className="border-t border-zinc-800 py-6 text-center text-sm text-zinc-500">
        <p>
          Shared via{" "}
          <Link href="/" className="text-blue-400 hover:underline">
            Nextier
          </Link>
        </p>
      </footer>
    </div>
  );
}

// Lead View Component
function LeadView({ data }: { data: Record<string, any> }) {
  return (
    <div className="space-y-6">
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-blue-400" />
            {data.first_name || data.firstName || ""}{" "}
            {data.last_name || data.lastName || "Contact"}
          </CardTitle>
          {data.company && (
            <CardDescription className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              {data.company}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-6">
          {/* Contact Info */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide">
              Contact Information
            </h3>
            {(data.phone || data.primary_phone) && (
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-green-400" />
                <span>{data.phone || data.primary_phone}</span>
              </div>
            )}
            {(data.email || data.primary_email) && (
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-blue-400" />
                <span>{data.email || data.primary_email}</span>
              </div>
            )}
            {(data.address || data.property_address) && (
              <div className="flex items-center gap-3">
                <MapPin className="h-4 w-4 text-amber-400" />
                <span>
                  {data.address || data.property_address}
                  {data.city && `, ${data.city}`}
                  {data.state && ` ${data.state}`}
                  {data.zip && ` ${data.zip}`}
                </span>
              </div>
            )}
          </div>

          {/* Additional Details */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide">
              Details
            </h3>
            {data.lead_score && (
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Lead Score</span>
                <Badge variant={data.lead_score > 70 ? "default" : "secondary"}>
                  {data.lead_score}
                </Badge>
              </div>
            )}
            {data.status && (
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Status</span>
                <Badge variant="outline">{data.status}</Badge>
              </div>
            )}
            {data.source && (
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Source</span>
                <span>{data.source}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Notes if available */}
      {data.notes && (
        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-lg">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-zinc-300 whitespace-pre-wrap">{data.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// Valuation Report View Component
function ValuationReportView({ data }: { data: Record<string, any> }) {
  return (
    <div className="space-y-6">
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Home className="h-5 w-5 text-emerald-400" />
            Property Valuation Report
          </CardTitle>
          {data.property_address && (
            <CardDescription className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              {data.property_address}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Valuation Summary */}
          <div className="grid md:grid-cols-3 gap-4">
            {data.estimated_value && (
              <div className="bg-zinc-800 rounded-lg p-4 text-center">
                <DollarSign className="h-6 w-6 text-emerald-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-emerald-400">
                  ${Number(data.estimated_value).toLocaleString()}
                </p>
                <p className="text-sm text-zinc-400">Estimated Value</p>
              </div>
            )}
            {data.equity && (
              <div className="bg-zinc-800 rounded-lg p-4 text-center">
                <TrendingUp className="h-6 w-6 text-blue-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-blue-400">
                  ${Number(data.equity).toLocaleString()}
                </p>
                <p className="text-sm text-zinc-400">Estimated Equity</p>
              </div>
            )}
            {data.mortgage_balance && (
              <div className="bg-zinc-800 rounded-lg p-4 text-center">
                <FileText className="h-6 w-6 text-amber-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-amber-400">
                  ${Number(data.mortgage_balance).toLocaleString()}
                </p>
                <p className="text-sm text-zinc-400">Mortgage Balance</p>
              </div>
            )}
          </div>

          {/* Property Details */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide">
                Property Details
              </h3>
              {data.bedrooms && (
                <div className="flex justify-between">
                  <span className="text-zinc-400">Bedrooms</span>
                  <span>{data.bedrooms}</span>
                </div>
              )}
              {data.bathrooms && (
                <div className="flex justify-between">
                  <span className="text-zinc-400">Bathrooms</span>
                  <span>{data.bathrooms}</span>
                </div>
              )}
              {data.sqft && (
                <div className="flex justify-between">
                  <span className="text-zinc-400">Square Feet</span>
                  <span>{Number(data.sqft).toLocaleString()}</span>
                </div>
              )}
              {data.year_built && (
                <div className="flex justify-between">
                  <span className="text-zinc-400">Year Built</span>
                  <span>{data.year_built}</span>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide">
                Owner Information
              </h3>
              {data.owner_name && (
                <div className="flex justify-between">
                  <span className="text-zinc-400">Owner</span>
                  <span>{data.owner_name}</span>
                </div>
              )}
              {data.owner_occupied !== undefined && (
                <div className="flex justify-between">
                  <span className="text-zinc-400">Owner Occupied</span>
                  <span>{data.owner_occupied ? "Yes" : "No"}</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Property View Component
function PropertyView({ data }: { data: Record<string, any> }) {
  return <LeadView data={data} />; // Similar to lead for now
}

// Generic View Component
function GenericView({
  data,
  resourceType,
}: {
  data: Record<string, any>;
  resourceType: string;
}) {
  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader>
        <CardTitle className="capitalize">
          {resourceType.replace("_", " ")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <pre className="bg-zinc-800 p-4 rounded-lg overflow-auto text-sm text-zinc-300">
          {JSON.stringify(data, null, 2)}
        </pre>
      </CardContent>
    </Card>
  );
}
