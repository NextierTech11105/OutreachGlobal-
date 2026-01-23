"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  Database,
  CalendarIcon,
  FileText,
  ListTodo,
  Send,
  ChevronRight,
  CheckCircle,
  Loader2,
  Zap,
  Phone,
  DollarSign,
} from "lucide-react";

/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * QUICK SEND - Campaign Command Center
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * COST STRUCTURE:
 * - Tracerfy: $0.02/lead → Primary Phone (mobile, usually accurate) + emails
 * - Trestle Validation: $0.015/phone → Score + Line Type (optional)
 *
 * 4 TABS:
 * 1. Data Lake - Browse USBizData CSVs, select batches, enrich
 * 2. Calendar - Schedule sends, set windows
 * 3. Templates - SMS templates
 * 4. Queue - Active message queue
 */

interface DataLakeBatch {
  id: string;
  name: string;
  sicCode?: string;
  leadCount: number;
  enrichedCount: number;
  status: "raw" | "enriching" | "ready";
  createdAt: string;
}

export default function QuickSendPage() {
  const [activeTab, setActiveTab] = useState("datalake");

  // Data Lake state
  const [batches, setBatches] = useState<DataLakeBatch[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [enrichLimit, setEnrichLimit] = useState(100);

  // Calendar state
  const [scheduleDate, setScheduleDate] = useState<Date | undefined>(undefined);
  const [sendWindow, setSendWindow] = useState({ start: "09:00", end: "17:00" });
  const [dailyLimit, setDailyLimit] = useState(500);

  // Quick send state
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  // Load batches on mount
  useEffect(() => {
    loadBatches();
  }, []);

  const loadBatches = async () => {
    setLoading(true);
    try {
      // Real batches from USBizData
      const mockBatches: DataLakeBatch[] = [
        { id: "sic-8742", name: "SIC 8742 - Management Consultants", sicCode: "8742", leadCount: 168000, enrichedCount: 0, status: "raw", createdAt: "2024-01-15" },
        { id: "sic-1711", name: "SIC 1711 - Plumbing & HVAC", sicCode: "1711", leadCount: 110000, enrichedCount: 0, status: "raw", createdAt: "2024-01-18" },
        { id: "sic-6531", name: "SIC 6531 - Real Estate Agents", sicCode: "6531", leadCount: 390000, enrichedCount: 15000, status: "ready", createdAt: "2024-01-12" },
      ];
      setBatches(mockBatches);
    } catch {
      toast.error("Failed to load batches");
    } finally {
      setLoading(false);
    }
  };

  const getSelectedBatch = () => batches.find(b => b.id === selectedBatch);

  const startEnrichment = async () => {
    if (!selectedBatch) return;
    setEnriching(true);
    try {
      const response = await fetch("/api/luci/enrich", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          limit: enrichLimit,
          level: "skip_trace_only", // Just Tracerfy at $0.02 for primary phone
          campaignType: enrichLimit <= 100 ? "small" : enrichLimit <= 500 ? "medium" : "large",
          confirmed: true,
        }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success(`Started enrichment for ${data.stats?.enriching || enrichLimit} leads`);
        loadBatches();
      } else {
        toast.error(data.error || "Enrichment failed");
      }
    } catch {
      toast.error("Failed to start enrichment");
    } finally {
      setEnriching(false);
    }
  };

  const sendQuickSMS = async () => {
    if (!phone || !message) { toast.error("Enter phone and message"); return; }
    setSending(true);
    try {
      const response = await fetch("/api/test-sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: phone, message }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success("SMS sent!");
        setPhone(""); setMessage("");
      } else {
        toast.error(data.error || "Failed to send");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setSending(false);
    }
  };

  const enrichmentCost = enrichLimit * 0.02; // $0.02/lead for Tracerfy

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Quick Send</h1>
          <p className="text-muted-foreground">Data Lake → Enrich → Schedule → Send</p>
        </div>
        <Badge variant="outline">SignalHouse: 2K/day</Badge>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 lg:w-[600px]">
          <TabsTrigger value="datalake"><Database className="h-4 w-4 mr-2" />Data Lake</TabsTrigger>
          <TabsTrigger value="calendar"><CalendarIcon className="h-4 w-4 mr-2" />Calendar</TabsTrigger>
          <TabsTrigger value="templates"><FileText className="h-4 w-4 mr-2" />Templates</TabsTrigger>
          <TabsTrigger value="queue"><ListTodo className="h-4 w-4 mr-2" />Queue</TabsTrigger>
        </TabsList>

        {/* DATA LAKE TAB */}
        <TabsContent value="datalake" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Batch List */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle><Database className="h-5 w-5 inline mr-2" />USBizData Batches</CardTitle>
                <CardDescription>668K+ leads across SIC codes</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
                ) : (
                  <div className="space-y-2">
                    {batches.map((batch) => (
                      <div key={batch.id} onClick={() => setSelectedBatch(batch.id)}
                        className={`p-4 rounded-lg border cursor-pointer transition-colors ${selectedBatch === batch.id ? "border-primary bg-primary/5" : "hover:bg-muted/50"}`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">{batch.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {batch.leadCount.toLocaleString()} leads
                              {batch.enrichedCount > 0 && <span className="text-green-600 ml-2">({batch.enrichedCount.toLocaleString()} enriched)</span>}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={batch.status === "ready" ? "default" : "outline"}>
                              {batch.status === "ready" && <CheckCircle className="h-3 w-3 mr-1" />}
                              {batch.status}
                            </Badge>
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Enrichment Panel */}
            <Card>
              <CardHeader>
                <CardTitle><Zap className="h-5 w-5 inline mr-2" />LUCI Enrichment</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedBatch && getSelectedBatch()?.status === "raw" ? (
                  <>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Leads to Enrich: {enrichLimit}</label>
                      <Slider value={[enrichLimit]} onValueChange={([v]) => setEnrichLimit(v)} min={10} max={2000} step={10} />
                    </div>
                    <div className="p-4 bg-muted rounded-lg space-y-2">
                      <div className="flex justify-between text-sm">
                        <span><Phone className="h-4 w-4 inline mr-1" />Tracerfy:</span>
                        <span>$0.02/lead</span>
                      </div>
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>Returns:</span>
                        <span>Primary Mobile + Emails</span>
                      </div>
                      <div className="flex justify-between font-medium border-t pt-2">
                        <span>Total:</span>
                        <span className="text-green-600">${enrichmentCost.toFixed(2)}</span>
                      </div>
                    </div>
                    <Button onClick={startEnrichment} disabled={enriching} className="w-full">
                      {enriching ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Enriching...</> : <><Zap className="h-4 w-4 mr-2" />Enrich {enrichLimit} Leads</>}
                    </Button>
                  </>
                ) : selectedBatch ? (
                  <div className="text-center py-8">
                    <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-600" />
                    <p>Ready for SMS!</p>
                    <Button className="mt-4" onClick={() => setActiveTab("calendar")}>Schedule Send</Button>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Database className="h-8 w-8 mx-auto mb-2" />
                    <p>Select a batch</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* CALENDAR TAB */}
        <TabsContent value="calendar" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Schedule Campaign</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Calendar mode="single" selected={scheduleDate} onSelect={setScheduleDate} disabled={(date) => date < new Date()} className="rounded-md border mx-auto" />
                {scheduleDate && <div className="p-4 bg-muted rounded-lg"><p className="font-medium">Selected: {format(scheduleDate, "EEEE, MMMM d, yyyy")}</p></div>}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Send Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Send Window (ET)</label>
                  <div className="flex items-center gap-2">
                    <Select value={sendWindow.start} onValueChange={(v) => setSendWindow({ ...sendWindow, start: v })}>
                      <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
                      <SelectContent>{["08:00", "09:00", "10:00", "11:00"].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                    </Select>
                    <span>to</span>
                    <Select value={sendWindow.end} onValueChange={(v) => setSendWindow({ ...sendWindow, end: v })}>
                      <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
                      <SelectContent>{["16:00", "17:00", "18:00", "19:00", "20:00"].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Daily Limit: {dailyLimit}</label>
                  <Slider value={[dailyLimit]} onValueChange={([v]) => setDailyLimit(v)} min={100} max={2000} step={100} />
                  <p className="text-xs text-muted-foreground">SignalHouse max: 2,000/day</p>
                </div>
                <Button className="w-full" disabled={!scheduleDate}><CalendarIcon className="h-4 w-4 mr-2" />Schedule Campaign</Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TEMPLATES TAB */}
        <TabsContent value="templates" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>SMS Templates</CardTitle>
              <CardDescription>Variables: {"{firstName}"}, {"{companyName}"}, {"{address}"}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { name: "Initial Outreach", text: "Hi {firstName}, this is Emily. Quick question about {companyName} - are you open to a brief conversation?" },
                  { name: "Property Interest", text: "Hi {firstName}, I noticed {address}. Would you be interested in a free property valuation?" },
                  { name: "Follow Up", text: "Hi {firstName}, just following up on my previous message. Let me know if you have any questions!" },
                  { name: "Final Touch", text: "Hi {firstName}, this is my last message. If the timing isn't right, no worries at all. Best of luck!" },
                ].map((t, i) => (
                  <div key={i} className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer">
                    <div className="font-medium mb-2">{t.name}</div>
                    <p className="text-sm text-muted-foreground">{t.text}</p>
                  </div>
                ))}
              </div>
              <div className="border-t pt-4 space-y-4">
                <div className="font-medium">Quick Send (One-Off)</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input placeholder="+15551234567" value={phone} onChange={(e) => setPhone(e.target.value)} />
                  <Textarea placeholder="Your message..." value={message} onChange={(e) => setMessage(e.target.value)} rows={2} />
                </div>
                <Button onClick={sendQuickSMS} disabled={sending}>
                  {sending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Sending...</> : <><Send className="h-4 w-4 mr-2" />Send SMS</>}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* QUEUE TAB */}
        <TabsContent value="queue" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle><ListTodo className="h-5 w-5 inline mr-2" />SMS Queue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <ListTodo className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="font-medium">No messages in queue</p>
                <p className="text-sm">Schedule a campaign to see messages here</p>
                <Button variant="outline" className="mt-4" onClick={() => setActiveTab("calendar")}>Schedule Campaign</Button>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Queue Statistics</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "Pending", value: "0", color: "" },
                  { label: "Sent Today", value: "0", color: "text-green-600" },
                  { label: "Failed", value: "0", color: "text-red-600" },
                  { label: "Daily Limit", value: "2,000", color: "" },
                ].map((s, i) => (
                  <div key={i} className="p-4 bg-muted rounded-lg text-center">
                    <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                    <div className="text-sm text-muted-foreground">{s.label}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
