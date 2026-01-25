"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TeamSection } from "@/features/team/layouts/team-section";
import { TeamHeader } from "@/features/team/layouts/team-header";
import { useCurrentTeam } from "@/features/team/team.context";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Sparkles, ArrowLeft, ArrowRight } from "lucide-react";

// IF triggers
const TRIGGERS = [
  { id: "no_response_3", label: "No response for 3 days" },
  { id: "no_response_7", label: "No response for 7 days" },
  { id: "no_response_14", label: "No response for 14 days" },
  { id: "lead_created", label: "New lead created" },
  { id: "response_received", label: "Lead responds" },
  { id: "hot_lead", label: "Lead marked as hot" },
];

// THEN actions
const ACTIONS = [
  { id: "send_sms", label: "Send SMS" },
  { id: "send_reminder", label: "Send reminder SMS" },
  { id: "add_tag", label: "Add tag" },
  { id: "move_to_bucket", label: "Move to bucket" },
  { id: "notify_team", label: "Notify team" },
  { id: "schedule_call", label: "Schedule call" },
];

// Tags
const TAGS = [
  "Hot Lead", "Cold Lead", "Responded", "No Response", "Follow Up",
  "Qualified", "Not Interested", "Call Back", "Meeting Scheduled"
];

export default function AutomationSetupPage() {
  const { teamId } = useCurrentTeam();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState("");
  const [trigger, setTrigger] = useState("");
  const [action, setAction] = useState("");
  const [tag, setTag] = useState("");
  const [message, setMessage] = useState("");

  const handleCreate = async () => {
    if (!name || !trigger || !action) {
      toast.error("Fill in all fields");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/t/${teamId}/workflows`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          status: "active",
          trigger,
          config: { trigger, action, tag, message },
        }),
      });

      if (res.ok) {
        toast.success("Automation created!");
        router.push(`/t/${teamId}/automations`);
      } else {
        toast.error("Failed");
      }
    } catch {
      toast.error("Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <TeamSection>
      <TeamHeader />
      <div className="p-6 max-w-2xl mx-auto">
        <Button variant="ghost" className="mb-6" onClick={() => router.push(`/t/${teamId}/automations`)}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>

        <h1 className="text-2xl font-bold mb-8">Create Automation</h1>

        {/* Name */}
        <div className="mb-6">
          <Label>Name</Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., 7 Day No Response Follow Up"
            className="mt-2"
          />
        </div>

        {/* IF THIS THEN THAT */}
        <Card className="p-6">
          <div className="flex items-center gap-4 flex-wrap">
            {/* IF */}
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg">IF</span>
              <Select value={trigger} onValueChange={setTrigger}>
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder="Select trigger..." />
                </SelectTrigger>
                <SelectContent>
                  {TRIGGERS.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <ArrowRight className="w-5 h-5 text-muted-foreground" />

            {/* THEN */}
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg">THEN</span>
              <Select value={action} onValueChange={setAction}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select action..." />
                </SelectTrigger>
                <SelectContent>
                  {ACTIONS.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Action Config */}
          {action === "add_tag" && (
            <div className="mt-4">
              <Label>Tag to add</Label>
              <Select value={tag} onValueChange={setTag}>
                <SelectTrigger className="mt-2 w-[200px]">
                  <SelectValue placeholder="Select tag..." />
                </SelectTrigger>
                <SelectContent>
                  {TAGS.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {(action === "send_sms" || action === "send_reminder") && (
            <div className="mt-4">
              <Label>Message</Label>
              <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Hey {firstName}, just checking in..."
                className="mt-2"
              />
            </div>
          )}
        </Card>

        {/* Create */}
        <Button onClick={handleCreate} disabled={loading || !name || !trigger || !action} className="mt-6">
          <Sparkles className="w-4 h-4 mr-2" />
          Create Automation
        </Button>
      </div>
    </TeamSection>
  );
}
