"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Phone,
  Bot,
  Plus,
  Trash2,
  Settings,
  Loader2,
  CheckCircle,
  XCircle,
  MessageSquare,
  PhoneCall,
  Brain,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type PhoneProvider = "easify" | "signalhouse" | "twilio";

interface PhoneNumber {
  id: string;
  number: string;
  friendlyName: string;
  provider: PhoneProvider;
  capabilities: {
    sms: boolean;
    voice: boolean;
    mms: boolean;
    bulkSms: boolean;
  };
  giannaEnabled: boolean;
  giannaMode: "inbound" | "outbound" | "both" | "off";
  giannaAvatar?: string;
  status: "active" | "inactive" | "pending";
}

const PROVIDER_CONFIG = {
  easify: {
    name: "Easify",
    color: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    description: "Dialer + SMS at wholesale rates",
  },
  signalhouse: {
    name: "Outreach Engine",
    color: "bg-green-500/20 text-green-400 border-green-500/30",
    description: "Bulk SMS campaigns",
  },
  twilio: {
    name: "Twilio",
    color: "bg-red-500/20 text-red-400 border-red-500/30",
    description: "Direct Twilio",
  },
} as const;

interface GiannaAvatar {
  id: string;
  name: string;
  description: string;
  industry: string;
  active: boolean;
}

export function GiannaPhonePool() {
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([]);
  const [avatars, setAvatars] = useState<GiannaAvatar[]>([]);
  const [loading, setLoading] = useState(true);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [selectedPhone, setSelectedPhone] = useState<PhoneNumber | null>(null);
  const [saving, setSaving] = useState(false);

  // Fetch phone numbers from all providers
  useEffect(() => {
    fetchPhoneNumbers();
    fetchAvatars();
  }, []);

  const fetchPhoneNumbers = async () => {
    try {
      // Fetch from all providers in parallel
      const [easifyRes, signalhouseRes] = await Promise.allSettled([
        fetch("/api/providers/easify/numbers"),
        fetch("/api/providers/signalhouse/numbers"),
      ]);

      const allNumbers: PhoneNumber[] = [];

      // Process Easify numbers (Dialer + SMS)
      if (easifyRes.status === "fulfilled" && easifyRes.value.ok) {
        const data = await easifyRes.value.json();
        const easifyNumbers = (data.numbers || []).map((num: any) => ({
          id: `easify-${num.id || num.phoneNumber}`,
          number: num.phoneNumber || num.number,
          friendlyName: num.label || num.friendlyName || "Easify Line",
          provider: "easify" as PhoneProvider,
          capabilities: {
            sms: true,
            voice: true, // Easify supports dialer
            mms: false,
            bulkSms: false,
          },
          giannaEnabled: num.giannaEnabled || false,
          giannaMode: num.giannaMode || "off",
          giannaAvatar: num.giannaAvatar || "",
          status: num.status || "active",
        }));
        allNumbers.push(...easifyNumbers);
      }

      // Process Outreach Engine numbers (Bulk SMS only)
      if (signalhouseRes.status === "fulfilled" && signalhouseRes.value.ok) {
        const data = await signalhouseRes.value.json();
        const signalhouseNumbers = (data.numbers || []).map((num: any) => ({
          id: `signalhouse-${num.id || num.phoneNumber}`,
          number: num.phoneNumber || num.number,
          friendlyName: num.label || num.friendlyName || "Bulk SMS",
          provider: "signalhouse" as PhoneProvider,
          capabilities: {
            sms: true,
            voice: false, // SMS only
            mms: false,
            bulkSms: true, // Bulk SMS capability
          },
          giannaEnabled: num.giannaEnabled || false,
          giannaMode: num.giannaMode || "off",
          giannaAvatar: num.giannaAvatar || "",
          status: num.status || "active",
        }));
        allNumbers.push(...signalhouseNumbers);
      }

      // If no numbers from providers, show demo data
      if (allNumbers.length === 0) {
        allNumbers.push(
          {
            id: "easify-demo-1",
            number: "+18889990001",
            friendlyName: "Main Dialer Line",
            provider: "easify",
            capabilities: {
              sms: true,
              voice: true,
              mms: false,
              bulkSms: false,
            },
            giannaEnabled: true,
            giannaMode: "both",
            giannaAvatar: "gianna-default",
            status: "active",
          },
          {
            id: "easify-demo-2",
            number: "+18889990002",
            friendlyName: "SMS Response Line",
            provider: "easify",
            capabilities: {
              sms: true,
              voice: true,
              mms: false,
              bulkSms: false,
            },
            giannaEnabled: true,
            giannaMode: "inbound",
            giannaAvatar: "gianna-default",
            status: "active",
          },
          {
            id: "signalhouse-demo-1",
            number: "+18889990003",
            friendlyName: "Bulk Campaign Pool",
            provider: "signalhouse",
            capabilities: {
              sms: true,
              voice: false,
              mms: false,
              bulkSms: true,
            },
            giannaEnabled: false,
            giannaMode: "off",
            status: "active",
          },
        );
      }

      setPhoneNumbers(allNumbers);
    } catch (error) {
      console.error("Failed to fetch phone numbers:", error);
      toast.error("Failed to load phone numbers");
    } finally {
      setLoading(false);
    }
  };

  const fetchAvatars = async () => {
    try {
      // This would fetch from your AI SDR avatars
      const response = await fetch("/api/ai-sdr/avatars");
      if (response.ok) {
        const data = await response.json();
        setAvatars(data.avatars || []);
      }
    } catch (error) {
      console.log("Using default avatars");
      // Default Gianna avatar
      setAvatars([
        {
          id: "gianna-default",
          name: "Gianna",
          description: "Default AI assistant for property inquiries",
          industry: "Real Estate",
          active: true,
        },
      ]);
    }
  };

  const handleConfigPhone = (phone: PhoneNumber) => {
    setSelectedPhone(phone);
    setConfigDialogOpen(true);
  };

  const handleSaveConfig = async () => {
    if (!selectedPhone) return;

    setSaving(true);
    try {
      const response = await fetch("/api/twilio/phone-numbers/configure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumberSid: selectedPhone.id,
          giannaEnabled: selectedPhone.giannaEnabled,
          giannaMode: selectedPhone.giannaMode,
          giannaAvatar: selectedPhone.giannaAvatar,
        }),
      });

      if (response.ok) {
        // Update local state
        setPhoneNumbers((prev) =>
          prev.map((p) => (p.id === selectedPhone.id ? selectedPhone : p)),
        );
        toast.success("Phone number configured for Gianna AI");
        setConfigDialogOpen(false);
      } else {
        throw new Error("Failed to configure");
      }
    } catch (error) {
      console.error("Failed to save config:", error);
      toast.error("Failed to save configuration");
    } finally {
      setSaving(false);
    }
  };

  const toggleGianna = async (phone: PhoneNumber, enabled: boolean) => {
    const updatedPhone = { ...phone, giannaEnabled: enabled };
    if (!enabled) {
      updatedPhone.giannaMode = "off";
    } else if (updatedPhone.giannaMode === "off") {
      updatedPhone.giannaMode = "inbound";
    }

    try {
      const response = await fetch("/api/twilio/phone-numbers/configure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumberSid: phone.id,
          giannaEnabled: enabled,
          giannaMode: updatedPhone.giannaMode,
        }),
      });

      if (response.ok) {
        setPhoneNumbers((prev) =>
          prev.map((p) => (p.id === phone.id ? updatedPhone : p)),
        );
        toast.success(enabled ? "Gianna AI enabled" : "Gianna AI disabled");
      }
    } catch (error) {
      toast.error("Failed to update Gianna settings");
    }
  };

  const getModeColor = (mode: PhoneNumber["giannaMode"]) => {
    switch (mode) {
      case "inbound":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30";
      case "outbound":
        return "bg-green-500/20 text-green-400 border-green-500/30";
      case "both":
        return "bg-purple-500/20 text-purple-400 border-purple-500/30";
      default:
        return "bg-gray-500/20 text-gray-400 border-gray-500/30";
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-primary" />
                Gianna AI Phone Pool
              </CardTitle>
              <CardDescription>
                Assign Gianna AI to handle communications. Uses integrated
                dialer and bulk SMS infrastructure.
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={fetchPhoneNumbers}>
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {phoneNumbers.length === 0 ? (
            <div className="text-center py-8">
              <Phone className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-medium mb-2">No Phone Numbers Found</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Connect your Twilio account to manage phone numbers
              </p>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Phone Number
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Phone Number</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Capabilities</TableHead>
                  <TableHead>Gianna AI</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {phoneNumbers.map((phone) => (
                  <TableRow key={phone.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{phone.number}</div>
                        <div className="text-xs text-muted-foreground">
                          {phone.friendlyName}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-xs",
                          PROVIDER_CONFIG[phone.provider].color,
                        )}
                      >
                        {PROVIDER_CONFIG[phone.provider].name}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {phone.capabilities.voice && (
                          <Badge variant="outline" className="text-xs">
                            <PhoneCall className="h-3 w-3 mr-1" />
                            Dialer
                          </Badge>
                        )}
                        {phone.capabilities.sms &&
                          !phone.capabilities.bulkSms && (
                            <Badge variant="outline" className="text-xs">
                              <MessageSquare className="h-3 w-3 mr-1" />
                              SMS
                            </Badge>
                          )}
                        {phone.capabilities.bulkSms && (
                          <Badge
                            variant="outline"
                            className="text-xs bg-green-500/10 text-green-400 border-green-500/30"
                          >
                            <Zap className="h-3 w-3 mr-1" />
                            Bulk SMS
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={phone.giannaEnabled}
                        onCheckedChange={(checked) =>
                          toggleGianna(phone, checked)
                        }
                      />
                    </TableCell>
                    <TableCell>
                      {phone.giannaEnabled && (
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-xs",
                            getModeColor(phone.giannaMode),
                          )}
                        >
                          {phone.giannaMode === "inbound" && "Inbound"}
                          {phone.giannaMode === "outbound" && "Outbound"}
                          {phone.giannaMode === "both" && "Both"}
                          {phone.giannaMode === "off" && "Off"}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {phone.status === "active" ? (
                        <div className="flex items-center gap-1 text-green-500">
                          <CheckCircle className="h-4 w-4" />
                          <span className="text-xs">Active</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-red-500">
                          <XCircle className="h-4 w-4" />
                          <span className="text-xs">Inactive</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleConfigPhone(phone)}
                      >
                        <Settings className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Configuration Dialog */}
      <Dialog open={configDialogOpen} onOpenChange={setConfigDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" />
              Configure Gianna AI
            </DialogTitle>
            <DialogDescription>
              Configure how Gianna AI handles calls and messages on{" "}
              <span className="font-medium">{selectedPhone?.number}</span>
            </DialogDescription>
          </DialogHeader>

          {selectedPhone && (
            <div className="space-y-6 py-4">
              {/* Enable/Disable */}
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base">Enable Gianna AI</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow Gianna to handle communications on this number
                  </p>
                </div>
                <Switch
                  checked={selectedPhone.giannaEnabled}
                  onCheckedChange={(checked) =>
                    setSelectedPhone({
                      ...selectedPhone,
                      giannaEnabled: checked,
                    })
                  }
                />
              </div>

              {selectedPhone.giannaEnabled && (
                <>
                  {/* Mode Selection */}
                  <div className="space-y-2">
                    <Label>Gianna Mode</Label>
                    <Select
                      value={selectedPhone.giannaMode}
                      onValueChange={(value: PhoneNumber["giannaMode"]) =>
                        setSelectedPhone({
                          ...selectedPhone,
                          giannaMode: value,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select mode" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="inbound">
                          <div className="flex items-center gap-2">
                            <PhoneCall className="h-4 w-4" />
                            Inbound Only - Answer incoming calls/SMS
                          </div>
                        </SelectItem>
                        <SelectItem value="outbound">
                          <div className="flex items-center gap-2">
                            <Zap className="h-4 w-4" />
                            Outbound Only - Make calls/send SMS
                          </div>
                        </SelectItem>
                        <SelectItem value="both">
                          <div className="flex items-center gap-2">
                            <Bot className="h-4 w-4" />
                            Both - Full AI communication
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      {selectedPhone.giannaMode === "inbound" &&
                        "Gianna will answer incoming calls and respond to SMS messages"}
                      {selectedPhone.giannaMode === "outbound" &&
                        "Gianna will make outbound calls and send SMS campaigns"}
                      {selectedPhone.giannaMode === "both" &&
                        "Gianna will handle all inbound and outbound communications"}
                    </p>
                  </div>

                  {/* Avatar Selection */}
                  <div className="space-y-2">
                    <Label>AI Avatar</Label>
                    <Select
                      value={selectedPhone.giannaAvatar || "gianna-default"}
                      onValueChange={(value) =>
                        setSelectedPhone({
                          ...selectedPhone,
                          giannaAvatar: value,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select avatar" />
                      </SelectTrigger>
                      <SelectContent>
                        {avatars.map((avatar) => (
                          <SelectItem key={avatar.id} value={avatar.id}>
                            <div className="flex items-center gap-2">
                              <Brain className="h-4 w-4" />
                              {avatar.name} - {avatar.industry}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Select which AI personality Gianna should use for this
                      number
                    </p>
                  </div>

                  {/* Quick Actions */}
                  <div className="rounded-lg border bg-muted/30 p-4">
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <Zap className="h-4 w-4 text-yellow-500" />
                      Quick Settings
                    </h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm">
                          Auto-respond to missed calls
                        </span>
                        <Switch defaultChecked />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Schedule follow-ups</span>
                        <Switch defaultChecked />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Transcribe voicemails</span>
                        <Switch defaultChecked />
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfigDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveConfig} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Configuration
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
