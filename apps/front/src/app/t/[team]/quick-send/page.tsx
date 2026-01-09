"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

/**
 * QUICK SEND - A page that ACTUALLY WORKS
 *
 * No fake data. No mock stats. Just sends real SMS.
 */
export default function QuickSendPage() {
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<any>(null);

  const sendSMS = async () => {
    if (!phone) {
      toast.error("Enter a phone number");
      return;
    }
    if (!message) {
      toast.error("Enter a message");
      return;
    }

    setSending(true);
    setResult(null);

    try {
      const response = await fetch("/api/test-sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: phone, message }),
      });

      const data = await response.json();
      setResult(data);

      if (data.success) {
        toast.success("SMS sent!");
      } else {
        toast.error(data.error || "Failed to send");
      }
    } catch (error) {
      toast.error("Network error");
      setResult({ error: "Network error" });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="p-8 max-w-xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Quick Send SMS</CardTitle>
          <p className="text-sm text-muted-foreground">
            This actually sends real SMS via SignalHouse.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">Phone Number</label>
            <Input
              placeholder="+15551234567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-medium">Message</label>
            <Textarea
              placeholder="Your message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
            />
          </div>
          <Button onClick={sendSMS} disabled={sending} className="w-full">
            {sending ? "Sending..." : "Send SMS"}
          </Button>

          {result && (
            <div className="mt-4 p-4 bg-muted rounded text-sm font-mono">
              <pre>{JSON.stringify(result, null, 2)}</pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
