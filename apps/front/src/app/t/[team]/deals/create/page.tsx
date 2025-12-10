"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { TeamSection } from "@/features/team/layouts/team-section";
import { TeamHeader } from "@/features/team/layouts/team-header";
import { TeamLink } from "@/features/team/components/team-link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Building2,
  Home,
  Target,
  LayoutGrid,
  DollarSign,
  Save,
  Loader2,
} from "lucide-react";

const DEAL_TYPES = [
  {
    value: "b2b_exit",
    label: "B2B Exit",
    icon: Building2,
    description: "Business-to-business sale",
  },
  {
    value: "commercial",
    label: "Commercial",
    icon: Building2,
    description: "Commercial property deal",
  },
  {
    value: "assemblage",
    label: "Assemblage",
    icon: LayoutGrid,
    description: "Multiple property consolidation",
  },
  {
    value: "blue_collar_exit",
    label: "Blue Collar Exit",
    icon: Building2,
    description: "Trade/service business exit",
  },
  {
    value: "development",
    label: "Development",
    icon: Target,
    description: "Development opportunity",
  },
  {
    value: "residential_haos",
    label: "Residential HAOS",
    icon: Home,
    description: "Homeowner assistance/sale",
  },
];

const PRIORITIES = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

const DEFAULT_RATES: Record<string, { type: string; rate: number }> = {
  b2b_exit: { type: "advisory", rate: 5 },
  commercial: { type: "commission", rate: 6 },
  assemblage: { type: "commission", rate: 6 },
  blue_collar_exit: { type: "advisory", rate: 5 },
  development: { type: "equity", rate: 10 },
  residential_haos: { type: "commission", rate: 3 },
};

interface Lead {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  propertyAddress?: string;
  companyName?: string;
  estimatedValue?: number;
}

export default function CreateDealPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const teamId = params.team as string;
  const leadIdParam = searchParams.get("leadId");

  const [loading, setLoading] = useState(false);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(true);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  const [formData, setFormData] = useState({
    leadId: leadIdParam || "",
    name: "",
    description: "",
    type: "",
    priority: "medium",
    estimatedValue: "",
    monetizationType: "",
    monetizationRate: "",
    expectedCloseDate: "",
    tags: "",
  });

  // Fetch leads for dropdown
  useEffect(() => {
    const fetchLeads = async () => {
      try {
        // Fetch leads that don't already have deals
        const response = await fetch(
          `/api/leads?teamId=${teamId}&status=qualified&limit=100`,
        );
        const data = await response.json();
        if (data.leads) {
          setLeads(data.leads);
          // If leadId was passed, find and select that lead
          if (leadIdParam) {
            const lead = data.leads.find((l: Lead) => l.id === leadIdParam);
            if (lead) {
              selectLead(lead);
            }
          }
        }
      } catch (error) {
        console.error("Failed to fetch leads:", error);
      } finally {
        setLoadingLeads(false);
      }
    };

    fetchLeads();
  }, [teamId, leadIdParam]);

  const selectLead = (lead: Lead) => {
    setSelectedLead(lead);
    setFormData((prev) => ({
      ...prev,
      leadId: lead.id,
      name:
        lead.propertyAddress ||
        lead.companyName ||
        `Deal - ${lead.firstName} ${lead.lastName}`,
      estimatedValue: lead.estimatedValue?.toString() || "",
    }));
  };

  const handleTypeChange = (type: string) => {
    const defaults = DEFAULT_RATES[type];
    setFormData((prev) => ({
      ...prev,
      type,
      monetizationType: defaults?.type || "",
      monetizationRate: defaults?.rate?.toString() || "",
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/deals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamId,
          userId: "current-user", // This should come from auth
          leadId: formData.leadId,
          name: formData.name,
          description: formData.description,
          type: formData.type,
          priority: formData.priority,
          estimatedValue: parseInt(formData.estimatedValue) || 0,
          monetization: {
            type: formData.monetizationType,
            rate: parseFloat(formData.monetizationRate) || 0,
          },
          expectedCloseDate: formData.expectedCloseDate || undefined,
          tags: formData.tags
            ? formData.tags.split(",").map((t) => t.trim())
            : [],
        }),
      });

      const data = await response.json();

      if (data.success) {
        router.push(`/t/${teamId}/deals/${data.deal.id}`);
      } else {
        alert(data.error || "Failed to create deal");
      }
    } catch (error) {
      console.error("Failed to create deal:", error);
      alert("Failed to create deal");
    } finally {
      setLoading(false);
    }
  };

  const isValid =
    formData.leadId &&
    formData.name &&
    formData.type &&
    formData.estimatedValue;

  return (
    <TeamSection>
      <TeamHeader title="Create Deal" />

      <div className="container max-w-3xl space-y-6">
        {/* Back Link */}
        <Button variant="ghost" asChild>
          <TeamLink href="/deals">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Pipeline
          </TeamLink>
        </Button>

        <div>
          <h1 className="text-2xl font-bold">Create New Deal</h1>
          <p className="text-muted-foreground mt-1">
            Create a deal from an existing lead to track through the pipeline
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Lead Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Select Lead</CardTitle>
              <CardDescription>
                Choose a qualified lead to create a deal from
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingLeads ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading leads...
                </div>
              ) : (
                <Select
                  value={formData.leadId}
                  onValueChange={(id) => {
                    const lead = leads.find((l) => l.id === id);
                    if (lead) selectLead(lead);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a lead..." />
                  </SelectTrigger>
                  <SelectContent>
                    {leads.map((lead) => (
                      <SelectItem key={lead.id} value={lead.id}>
                        <div className="flex items-center gap-2">
                          <span>
                            {lead.firstName} {lead.lastName}
                          </span>
                          {lead.propertyAddress && (
                            <span className="text-muted-foreground">
                              - {lead.propertyAddress}
                            </span>
                          )}
                          {lead.companyName && (
                            <span className="text-muted-foreground">
                              - {lead.companyName}
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {selectedLead && (
                <div className="mt-4 p-4 bg-muted rounded-lg">
                  <h4 className="font-medium mb-2">Selected Lead</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">Name: </span>
                      {selectedLead.firstName} {selectedLead.lastName}
                    </div>
                    {selectedLead.email && (
                      <div>
                        <span className="text-muted-foreground">Email: </span>
                        {selectedLead.email}
                      </div>
                    )}
                    {selectedLead.phone && (
                      <div>
                        <span className="text-muted-foreground">Phone: </span>
                        {selectedLead.phone}
                      </div>
                    )}
                    {selectedLead.propertyAddress && (
                      <div>
                        <span className="text-muted-foreground">
                          Property:{" "}
                        </span>
                        {selectedLead.propertyAddress}
                      </div>
                    )}
                    {selectedLead.companyName && (
                      <div>
                        <span className="text-muted-foreground">Company: </span>
                        {selectedLead.companyName}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Deal Type */}
          <Card>
            <CardHeader>
              <CardTitle>Deal Type</CardTitle>
              <CardDescription>
                Select the type of deal you&apos;re creating
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {DEAL_TYPES.map((type) => {
                  const Icon = type.icon;
                  return (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => handleTypeChange(type.value)}
                      className={`flex items-start gap-3 p-4 rounded-lg border text-left transition-colors ${
                        formData.type === type.value
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <Icon className="h-5 w-5 mt-0.5" />
                      <div>
                        <div className="font-medium">{type.label}</div>
                        <div className="text-xs text-muted-foreground">
                          {type.description}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Deal Details */}
          <Card>
            <CardHeader>
              <CardTitle>Deal Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">Deal Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Enter deal name"
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Brief description of the deal"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="priority">Priority</Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(v) =>
                      setFormData({ ...formData, priority: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PRIORITIES.map((p) => (
                        <SelectItem key={p.value} value={p.value}>
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="expectedCloseDate">Expected Close Date</Label>
                  <Input
                    id="expectedCloseDate"
                    type="date"
                    value={formData.expectedCloseDate}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        expectedCloseDate: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="tags">Tags (comma-separated)</Label>
                <Input
                  id="tags"
                  value={formData.tags}
                  onChange={(e) =>
                    setFormData({ ...formData, tags: e.target.value })
                  }
                  placeholder="e.g., hot lead, referral, NYC"
                />
              </div>
            </CardContent>
          </Card>

          {/* Financials */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Financials
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="estimatedValue">Estimated Value *</Label>
                <Input
                  id="estimatedValue"
                  type="number"
                  value={formData.estimatedValue}
                  onChange={(e) =>
                    setFormData({ ...formData, estimatedValue: e.target.value })
                  }
                  placeholder="Enter deal value in dollars"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="monetizationType">Monetization Type</Label>
                  <Select
                    value={formData.monetizationType}
                    onValueChange={(v) =>
                      setFormData({ ...formData, monetizationType: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="commission">Commission</SelectItem>
                      <SelectItem value="advisory">Advisory Fee</SelectItem>
                      <SelectItem value="referral">Referral Fee</SelectItem>
                      <SelectItem value="equity">Equity</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="monetizationRate">Rate (%)</Label>
                  <Input
                    id="monetizationRate"
                    type="number"
                    step="0.1"
                    value={formData.monetizationRate}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        monetizationRate: e.target.value,
                      })
                    }
                    placeholder="e.g., 6"
                  />
                </div>
              </div>

              {formData.estimatedValue && formData.monetizationRate && (
                <div className="p-4 bg-green-500/10 rounded-lg">
                  <div className="text-sm text-muted-foreground">
                    Estimated Revenue
                  </div>
                  <div className="text-2xl font-bold text-green-600">
                    $
                    {sf(
                      (parseInt(formData.estimatedValue) *
                        parseFloat(formData.monetizationRate)) /
                        100,
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" asChild>
              <TeamLink href="/deals">Cancel</TeamLink>
            </Button>
            <Button type="submit" disabled={!isValid || loading}>
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Create Deal
            </Button>
          </div>
        </form>
      </div>
    </TeamSection>
  );
}
