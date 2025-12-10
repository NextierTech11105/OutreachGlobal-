"use client";


import { sf, sfd } from "@/lib/utils/safe-format";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { TeamSection } from "@/features/team/layouts/team-section";
import { TeamHeader } from "@/features/team/layouts/team-header";
import { TeamLink } from "@/features/team/components/team-link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft,
  DollarSign,
  Building2,
  Home,
  User,
  Phone,
  Mail,
  Calendar,
  Clock,
  FileText,
  MessageSquare,
  Activity,
  ChevronRight,
  CheckCircle,
  XCircle,
  Edit2,
  Trash2,
  Upload,
  RefreshCw,
} from "lucide-react";

const STAGES = [
  { value: "discovery", label: "Discovery", color: "bg-blue-500" },
  { value: "qualification", label: "Qualification", color: "bg-purple-500" },
  { value: "proposal", label: "Proposal", color: "bg-amber-500" },
  { value: "negotiation", label: "Negotiation", color: "bg-orange-500" },
  { value: "contract", label: "Contract", color: "bg-emerald-500" },
  { value: "closing", label: "Closing", color: "bg-green-500" },
];

const CLOSED_REASONS = [
  { value: "price", label: "Price disagreement" },
  { value: "timing", label: "Bad timing" },
  { value: "competition", label: "Lost to competition" },
  { value: "financing", label: "Financing fell through" },
  { value: "other", label: "Other" },
];

interface Deal {
  id: string;
  name: string;
  description?: string;
  type: string;
  stage: string;
  priority: string;
  estimatedValue: number;
  askingPrice?: number;
  finalPrice?: number;
  monetization?: {
    type: string;
    rate: number;
    estimatedEarnings: number;
    actualEarnings?: number;
  };
  seller?: { name: string; email?: string; phone?: string; company?: string };
  buyer?: { name: string; email?: string; phone?: string; company?: string };
  property?: { address: string; type: string; sqft?: number; bedrooms?: number };
  business?: { name: string; industry: string; revenue?: number; employees?: number };
  expectedCloseDate?: string;
  actualCloseDate?: string;
  closedReason?: string;
  closedNotes?: string;
  tags?: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface DealActivity {
  id: string;
  type: string;
  title: string;
  description?: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatDateTime(date: string): string {
  return sfd(date, "en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function DealDetailPage() {
  const params = useParams();
  const router = useRouter();
  const teamId = params.team as string;
  const dealId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [deal, setDeal] = useState<Deal | null>(null);
  const [activities, setActivities] = useState<DealActivity[]>([]);
  const [updating, setUpdating] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [showCloseWon, setShowCloseWon] = useState(false);
  const [showCloseLost, setShowCloseLost] = useState(false);
  const [closeData, setCloseData] = useState({
    finalPrice: "",
    reason: "",
    notes: "",
  });

  const fetchDeal = async () => {
    try {
      const response = await fetch(`/api/deals/${dealId}?teamId=${teamId}`);
      const data = await response.json();

      if (data.success) {
        setDeal(data.deal);
        setActivities(data.activities || []);
      }
    } catch (error) {
      console.error("Failed to fetch deal:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (dealId && teamId) {
      fetchDeal();
    }
  }, [dealId, teamId]);

  const updateStage = async (newStage: string) => {
    if (!deal) return;

    setUpdating(true);
    try {
      const response = await fetch(`/api/deals/${dealId}/stage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamId,
          stage: newStage,
          reason: "Manual stage change",
        }),
      });

      const data = await response.json();
      if (data.success) {
        setDeal(data.deal);
        fetchDeal(); // Refresh activities
      }
    } catch (error) {
      console.error("Failed to update stage:", error);
    } finally {
      setUpdating(false);
    }
  };

  const closeDeal = async (won: boolean) => {
    if (!deal) return;

    setUpdating(true);
    try {
      const body: Record<string, unknown> = {
        teamId,
        stage: won ? "closed_won" : "closed_lost",
      };

      if (won) {
        body.finalPrice = parseInt(closeData.finalPrice) || deal.estimatedValue;
      } else {
        body.reason = closeData.reason;
        body.notes = closeData.notes;
      }

      const response = await fetch(`/api/deals/${dealId}/stage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await response.json();
      if (data.success) {
        setDeal(data.deal);
        setShowCloseWon(false);
        setShowCloseLost(false);
        fetchDeal();
      }
    } catch (error) {
      console.error("Failed to close deal:", error);
    } finally {
      setUpdating(false);
    }
  };

  const addNote = async () => {
    if (!newNote.trim() || !deal) return;

    setUpdating(true);
    try {
      const response = await fetch(`/api/deals/${dealId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamId,
          notes: deal.notes ? `${deal.notes}\n\n---\n\n${newNote}` : newNote,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setDeal(data.deal);
        setNewNote("");
        fetchDeal();
      }
    } catch (error) {
      console.error("Failed to add note:", error);
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <TeamSection>
        <div className="flex items-center justify-center h-96">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </TeamSection>
    );
  }

  if (!deal) {
    return (
      <TeamSection>
        <div className="container py-12 text-center">
          <h2 className="text-xl font-semibold mb-2">Deal not found</h2>
          <p className="text-muted-foreground mb-4">
            This deal may have been deleted or you don&apos;t have access.
          </p>
          <Button asChild>
            <TeamLink href="/deals">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Pipeline
            </TeamLink>
          </Button>
        </div>
      </TeamSection>
    );
  }

  const currentStageIndex = STAGES.findIndex((s) => s.value === deal.stage);
  const isClosed = deal.stage === "closed_won" || deal.stage === "closed_lost";

  return (
    <TeamSection>
      <TeamHeader title={deal.name} />

      <div className="container space-y-6">
        {/* Back Link */}
        <Button variant="ghost" asChild>
          <TeamLink href="/deals">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Pipeline
          </TeamLink>
        </Button>

        {/* Deal Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{deal.name}</h1>
              {isClosed ? (
                <Badge className={deal.stage === "closed_won" ? "bg-green-500" : "bg-red-500"}>
                  {deal.stage === "closed_won" ? "Won" : "Lost"}
                </Badge>
              ) : (
                <Badge variant="outline" className="capitalize">
                  {deal.stage.replace(/_/g, " ")}
                </Badge>
              )}
              {deal.priority === "high" && <Badge variant="destructive">High Priority</Badge>}
              {deal.priority === "urgent" && <Badge variant="destructive">Urgent</Badge>}
            </div>
            <p className="text-muted-foreground mt-1">{deal.description || "No description"}</p>
          </div>

          <div className="flex items-center gap-2">
            {!isClosed && (
              <>
                <AlertDialog open={showCloseWon} onOpenChange={setShowCloseWon}>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" className="text-green-600 border-green-600">
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Mark Won
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Close Deal as Won</AlertDialogTitle>
                      <AlertDialogDescription>
                        Congratulations! Enter the final deal price to close this deal.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="space-y-4 py-4">
                      <div>
                        <Label>Final Price</Label>
                        <Input
                          type="number"
                          placeholder={deal.estimatedValue.toString()}
                          value={closeData.finalPrice}
                          onChange={(e) => setCloseData({ ...closeData, finalPrice: e.target.value })}
                        />
                      </div>
                    </div>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => closeDeal(true)} disabled={updating}>
                        Close as Won
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

                <AlertDialog open={showCloseLost} onOpenChange={setShowCloseLost}>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" className="text-red-600 border-red-600">
                      <XCircle className="mr-2 h-4 w-4" />
                      Mark Lost
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Close Deal as Lost</AlertDialogTitle>
                      <AlertDialogDescription>
                        Help improve future deals by recording why this one didn&apos;t close.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="space-y-4 py-4">
                      <div>
                        <Label>Reason</Label>
                        <Select
                          value={closeData.reason}
                          onValueChange={(v) => setCloseData({ ...closeData, reason: v })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select reason" />
                          </SelectTrigger>
                          <SelectContent>
                            {CLOSED_REASONS.map((r) => (
                              <SelectItem key={r.value} value={r.value}>
                                {r.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Notes</Label>
                        <Textarea
                          placeholder="Additional notes..."
                          value={closeData.notes}
                          onChange={(e) => setCloseData({ ...closeData, notes: e.target.value })}
                        />
                      </div>
                    </div>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => closeDeal(false)}
                        disabled={updating || !closeData.reason}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        Close as Lost
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            )}
            <Button variant="outline">
              <Edit2 className="mr-2 h-4 w-4" />
              Edit
            </Button>
          </div>
        </div>

        {/* Stage Progress */}
        {!isClosed && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                {STAGES.map((stage, index) => (
                  <div key={stage.value} className="flex items-center">
                    <button
                      onClick={() => updateStage(stage.value)}
                      disabled={updating}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                        index <= currentStageIndex
                          ? `${stage.color} text-white`
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      <span className="text-sm font-medium">{stage.label}</span>
                    </button>
                    {index < STAGES.length - 1 && (
                      <ChevronRight className="h-5 w-5 mx-2 text-muted-foreground" />
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Content */}
        <div className="grid grid-cols-3 gap-6">
          {/* Left Column - Details */}
          <div className="col-span-2 space-y-6">
            <Tabs defaultValue="overview">
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="activity">Activity</TabsTrigger>
                <TabsTrigger value="documents">Documents</TabsTrigger>
                <TabsTrigger value="notes">Notes</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6 mt-4">
                {/* Financials */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5" />
                      Financials
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-muted-foreground">Estimated Value</Label>
                        <p className="text-xl font-bold">{formatCurrency(deal.estimatedValue)}</p>
                      </div>
                      {deal.askingPrice && (
                        <div>
                          <Label className="text-muted-foreground">Asking Price</Label>
                          <p className="text-xl font-bold">{formatCurrency(deal.askingPrice)}</p>
                        </div>
                      )}
                      {deal.finalPrice && (
                        <div>
                          <Label className="text-muted-foreground">Final Price</Label>
                          <p className="text-xl font-bold text-green-600">
                            {formatCurrency(deal.finalPrice)}
                          </p>
                        </div>
                      )}
                      {deal.monetization && (
                        <>
                          <div>
                            <Label className="text-muted-foreground">Monetization Type</Label>
                            <p className="font-medium capitalize">{deal.monetization.type}</p>
                          </div>
                          <div>
                            <Label className="text-muted-foreground">Rate</Label>
                            <p className="font-medium">{deal.monetization.rate}%</p>
                          </div>
                          <div>
                            <Label className="text-muted-foreground">Est. Revenue</Label>
                            <p className="text-xl font-bold text-green-600">
                              {formatCurrency(deal.monetization.estimatedEarnings)}
                            </p>
                          </div>
                          {deal.monetization.actualEarnings && (
                            <div>
                              <Label className="text-muted-foreground">Actual Revenue</Label>
                              <p className="text-xl font-bold text-green-600">
                                {formatCurrency(deal.monetization.actualEarnings)}
                              </p>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Property/Business Info */}
                {deal.property && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Home className="h-5 w-5" />
                        Property
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-muted-foreground">Address</Label>
                          <p className="font-medium">{deal.property.address}</p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">Type</Label>
                          <p className="font-medium">{deal.property.type}</p>
                        </div>
                        {deal.property.sqft && (
                          <div>
                            <Label className="text-muted-foreground">Sq Ft</Label>
                            <p className="font-medium">{sf(deal.property.sqft)}</p>
                          </div>
                        )}
                        {deal.property.bedrooms && (
                          <div>
                            <Label className="text-muted-foreground">Bedrooms</Label>
                            <p className="font-medium">{deal.property.bedrooms}</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {deal.business && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Building2 className="h-5 w-5" />
                        Business
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-muted-foreground">Name</Label>
                          <p className="font-medium">{deal.business.name}</p>
                        </div>
                        <div>
                          <Label className="text-muted-foreground">Industry</Label>
                          <p className="font-medium">{deal.business.industry}</p>
                        </div>
                        {deal.business.revenue && (
                          <div>
                            <Label className="text-muted-foreground">Revenue</Label>
                            <p className="font-medium">{formatCurrency(deal.business.revenue)}</p>
                          </div>
                        )}
                        {deal.business.employees && (
                          <div>
                            <Label className="text-muted-foreground">Employees</Label>
                            <p className="font-medium">{deal.business.employees}</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="activity" className="mt-4">
                <Card>
                  <CardContent className="p-4">
                    {activities.length > 0 ? (
                      <div className="space-y-4">
                        {activities.map((activity) => (
                          <div key={activity.id} className="flex gap-4 pb-4 border-b last:border-0">
                            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                              <Activity className="h-4 w-4" />
                            </div>
                            <div>
                              <p className="font-medium">{activity.title}</p>
                              {activity.description && (
                                <p className="text-sm text-muted-foreground">{activity.description}</p>
                              )}
                              <p className="text-xs text-muted-foreground mt-1">
                                {formatDateTime(activity.createdAt)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-center text-muted-foreground py-8">No activity yet</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="documents" className="mt-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="text-center py-8">
                      <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground mb-4">No documents uploaded yet</p>
                      <Button>
                        <Upload className="mr-2 h-4 w-4" />
                        Upload Document
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="notes" className="mt-4">
                <Card>
                  <CardContent className="p-4 space-y-4">
                    <div>
                      <Textarea
                        placeholder="Add a note..."
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        rows={3}
                      />
                      <Button onClick={addNote} disabled={updating || !newNote.trim()} className="mt-2">
                        Add Note
                      </Button>
                    </div>
                    {deal.notes && (
                      <div className="pt-4 border-t">
                        <Label className="text-muted-foreground">Notes</Label>
                        <div className="mt-2 whitespace-pre-wrap">{deal.notes}</div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            {/* Seller */}
            {deal.seller && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <User className="h-4 w-4" />
                    Seller
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="font-medium">{deal.seller.name}</p>
                  {deal.seller.company && (
                    <p className="text-sm text-muted-foreground">{deal.seller.company}</p>
                  )}
                  {deal.seller.email && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <a href={`mailto:${deal.seller.email}`} className="text-primary hover:underline">
                        {deal.seller.email}
                      </a>
                    </div>
                  )}
                  {deal.seller.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <a href={`tel:${deal.seller.phone}`} className="text-primary hover:underline">
                        {deal.seller.phone}
                      </a>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Buyer */}
            {deal.buyer && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <User className="h-4 w-4" />
                    Buyer
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="font-medium">{deal.buyer.name}</p>
                  {deal.buyer.company && (
                    <p className="text-sm text-muted-foreground">{deal.buyer.company}</p>
                  )}
                  {deal.buyer.email && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <a href={`mailto:${deal.buyer.email}`} className="text-primary hover:underline">
                        {deal.buyer.email}
                      </a>
                    </div>
                  )}
                  {deal.buyer.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <a href={`tel:${deal.buyer.phone}`} className="text-primary hover:underline">
                        {deal.buyer.phone}
                      </a>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Timeline */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Calendar className="h-4 w-4" />
                  Timeline
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-muted-foreground">Created</Label>
                  <p className="text-sm">{formatDate(deal.createdAt)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Last Updated</Label>
                  <p className="text-sm">{formatDate(deal.updatedAt)}</p>
                </div>
                {deal.expectedCloseDate && (
                  <div>
                    <Label className="text-muted-foreground">Expected Close</Label>
                    <p className="text-sm">{formatDate(deal.expectedCloseDate)}</p>
                  </div>
                )}
                {deal.actualCloseDate && (
                  <div>
                    <Label className="text-muted-foreground">Actual Close</Label>
                    <p className="text-sm">{formatDate(deal.actualCloseDate)}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Tags */}
            {deal.tags && deal.tags.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Tags</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {deal.tags.map((tag, i) => (
                      <Badge key={i} variant="outline">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </TeamSection>
  );
}
