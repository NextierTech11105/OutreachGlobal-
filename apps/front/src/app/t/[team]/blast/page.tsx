"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Upload, Send, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { useParams } from "next/navigation";

interface Lead {
  firstName: string;
  lastName: string;
  phone: string;
  company?: string;
}

export default function BlastPage() {
  const params = useParams();
  const teamId = params.team as string;
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State
  const [leads, setLeads] = useState<Lead[]>([]);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState({ sent: 0, failed: 0, total: 0 });
  const [step, setStep] = useState<"upload" | "compose" | "sending" | "done">("upload");

  // Parse CSV
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const lines = text.split("\n").filter(l => l.trim());
    if (lines.length < 2) {
      toast.error("CSV is empty");
      return;
    }

    // Parse headers
    const headers = lines[0].split(",").map(h => h.replace(/"/g, "").trim().toLowerCase());

    // Find column indexes
    const phoneIdx = headers.findIndex(h => h.includes("phone") || h.includes("mobile") || h.includes("cell"));
    const firstNameIdx = headers.findIndex(h => h.includes("first") || h === "firstname");
    const lastNameIdx = headers.findIndex(h => h.includes("last") || h === "lastname");
    const companyIdx = headers.findIndex(h => h.includes("company") || h.includes("business"));

    if (phoneIdx === -1) {
      toast.error("CSV must have a phone column");
      return;
    }

    // Parse leads
    const parsedLeads: Lead[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",").map(v => v.replace(/"/g, "").trim());
      const phone = values[phoneIdx];

      // Clean phone - must have 10+ digits
      const cleanPhone = phone?.replace(/\D/g, "");
      if (!cleanPhone || cleanPhone.length < 10) continue;

      parsedLeads.push({
        firstName: firstNameIdx >= 0 ? values[firstNameIdx] || "" : "",
        lastName: lastNameIdx >= 0 ? values[lastNameIdx] || "" : "",
        phone: cleanPhone.length === 10 ? `+1${cleanPhone}` : `+${cleanPhone}`,
        company: companyIdx >= 0 ? values[companyIdx] || "" : "",
      });
    }

    if (parsedLeads.length === 0) {
      toast.error("No valid phone numbers found");
      return;
    }

    setLeads(parsedLeads);
    setStep("compose");
    toast.success(`Loaded ${parsedLeads.length} leads from ${file.name}`);
  };

  // Send SMS
  const handleSend = async () => {
    if (!message.trim()) {
      toast.error("Enter a message");
      return;
    }

    if (leads.length === 0) {
      toast.error("No leads loaded");
      return;
    }

    // Limit to 100 for safety
    const toSend = leads.slice(0, 100);

    setSending(true);
    setStep("sending");
    setProgress({ sent: 0, failed: 0, total: toSend.length });

    let sent = 0;
    let failed = 0;

    for (const lead of toSend) {
      try {
        // Personalize message
        const personalizedMsg = message
          .replace(/{firstName}/gi, lead.firstName || "")
          .replace(/{lastName}/gi, lead.lastName || "")
          .replace(/{company}/gi, lead.company || "")
          .trim();

        const res = await fetch("/api/sms/quick-send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: lead.phone,
            message: personalizedMsg,
          }),
        });

        if (res.ok) {
          sent++;
        } else {
          failed++;
        }
      } catch {
        failed++;
      }

      setProgress({ sent, failed, total: toSend.length });

      // Small delay to avoid rate limiting
      await new Promise(r => setTimeout(r, 100));
    }

    setSending(false);
    setStep("done");
    toast.success(`Sent ${sent} messages, ${failed} failed`);
  };

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold mb-2">SMS BLAST</h1>
        <p className="text-zinc-400 mb-8">Upload CSV → Send SMS. That's it.</p>

        {/* Step 1: Upload */}
        {step === "upload" && (
          <div className="space-y-6">
            <div
              className="border-2 border-dashed border-zinc-700 rounded-xl p-12 text-center cursor-pointer hover:border-blue-500 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-16 w-16 mx-auto mb-4 text-zinc-500" />
              <p className="text-xl font-medium mb-2">Drop CSV or Click to Upload</p>
              <p className="text-zinc-500">Must have a phone column</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleFileUpload}
            />
          </div>
        )}

        {/* Step 2: Compose */}
        {step === "compose" && (
          <div className="space-y-6">
            <div className="bg-zinc-900 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-green-500 font-medium">
                  <CheckCircle2 className="h-5 w-5 inline mr-2" />
                  {leads.length} leads loaded
                </span>
                <Button variant="ghost" size="sm" onClick={() => { setLeads([]); setStep("upload"); }}>
                  Change File
                </Button>
              </div>

              {/* Preview */}
              <div className="text-sm text-zinc-400 space-y-1">
                <p>Sample: {leads[0]?.firstName} {leads[0]?.lastName} - {leads[0]?.phone}</p>
                {leads.length > 1 && <p>Sample: {leads[1]?.firstName} {leads[1]?.lastName} - {leads[1]?.phone}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Your Message</Label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Hi {firstName}, I wanted to reach out about..."
                className="min-h-[150px] bg-zinc-900 border-zinc-700"
              />
              <p className="text-xs text-zinc-500">
                Variables: {"{firstName}"} {"{lastName}"} {"{company}"}
              </p>
            </div>

            <div className="bg-amber-900/30 border border-amber-700 rounded-lg p-4">
              <p className="text-amber-200 text-sm">
                <AlertCircle className="h-4 w-4 inline mr-2" />
                Will send to first {Math.min(leads.length, 100)} leads (safety limit)
              </p>
            </div>

            <Button
              className="w-full h-14 text-lg bg-green-600 hover:bg-green-700"
              onClick={handleSend}
            >
              <Send className="h-5 w-5 mr-2" />
              Send to {Math.min(leads.length, 100)} Leads
            </Button>
          </div>
        )}

        {/* Step 3: Sending */}
        {step === "sending" && (
          <div className="space-y-6">
            <div className="bg-zinc-900 rounded-xl p-8 text-center">
              <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin text-blue-500" />
              <p className="text-xl font-medium mb-4">Sending Messages...</p>
              <Progress value={(progress.sent + progress.failed) / progress.total * 100} className="mb-4" />
              <p className="text-zinc-400">
                {progress.sent} sent, {progress.failed} failed of {progress.total}
              </p>
            </div>
          </div>
        )}

        {/* Step 4: Done */}
        {step === "done" && (
          <div className="space-y-6">
            <div className="bg-zinc-900 rounded-xl p-8 text-center">
              <CheckCircle2 className="h-16 w-16 mx-auto mb-4 text-green-500" />
              <p className="text-2xl font-bold mb-2">Complete!</p>
              <p className="text-zinc-400 mb-6">
                {progress.sent} messages sent, {progress.failed} failed
              </p>
              <Button onClick={() => { setLeads([]); setMessage(""); setStep("upload"); }}>
                Send Another Blast
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
