"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, CheckCircle2, Clock, MessageSquare, Rocket, Users, Loader2, CheckCircle } from "lucide-react";
import { toast } from "sonner";

export default function BookSetupCallPage() {
  const params = useParams();
  const router = useRouter();
  const teamSlug = params.team as string;

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    preferredDay: "",
    preferredTime: "",
    notes: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/setup-call/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          teamSlug,
        }),
      });

      if (res.ok) {
        setIsSubmitted(true);
        toast.success("Call request submitted! Thomas will reach out soon.");
      } else {
        throw new Error("Failed to submit");
      }
    } catch {
      toast.error("Failed to submit. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkipForNow = () => {
    router.push(`/t/${teamSlug}`);
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 py-12 px-4">
        <div className="container max-w-2xl mx-auto text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 mb-6">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold mb-4">Call Request Submitted!</h1>
          <p className="text-lg text-muted-foreground mb-8">
            Thomas will reach out within 24 hours to schedule your setup call.
            <br />In the meantime, feel free to explore the dashboard.
          </p>
          <Button size="lg" onClick={() => router.push(`/t/${teamSlug}`)}>
            <Rocket className="mr-2 h-5 w-5" />
            Explore Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 py-12 px-4">
      <div className="container max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <Rocket className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Welcome to Nextier!</h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Your account is ready. Let's schedule a quick setup call to get you launched.
          </p>
        </div>

        {/* Main Card */}
        <Card className="shadow-xl mb-8">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-2xl">Request Your Setup Call</CardTitle>
            <CardDescription className="text-base">
              30 minutes with Thomas to configure your machine for maximum results
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            {/* What you'll get */}
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <div className="space-y-4">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  What we'll cover:
                </h3>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3">
                    <Users className="h-5 w-5 text-primary mt-0.5" />
                    <span>Configure your ideal customer profile (ICP)</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <MessageSquare className="h-5 w-5 text-primary mt-0.5" />
                    <span>Set up your AI agents (GIANNA, CATHY, SABRINA)</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Rocket className="h-5 w-5 text-primary mt-0.5" />
                    <span>Launch your first campaign together</span>
                  </li>
                </ul>
              </div>
              <div className="space-y-4">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <Clock className="h-5 w-5 text-blue-500" />
                  Your 14-day trial includes:
                </h3>
                <ul className="space-y-3 text-muted-foreground">
                  <li>✓ Full platform access</li>
                  <li>✓ 5,000 leads capacity</li>
                  <li>✓ 1,000 SMS messages</li>
                  <li>✓ 100 skip trace credits</li>
                  <li>✓ AI-powered outreach</li>
                </ul>
              </div>
            </div>

            {/* Booking Form */}
            <form onSubmit={handleSubmit} className="space-y-6 border-t pt-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Your Name</Label>
                  <Input
                    id="name"
                    placeholder="John Smith"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Best Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="(555) 123-4567"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="preferredDay">Preferred Day</Label>
                  <Select
                    value={formData.preferredDay}
                    onValueChange={(value) => setFormData({ ...formData, preferredDay: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a day" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monday">Monday</SelectItem>
                      <SelectItem value="tuesday">Tuesday</SelectItem>
                      <SelectItem value="wednesday">Wednesday</SelectItem>
                      <SelectItem value="thursday">Thursday</SelectItem>
                      <SelectItem value="friday">Friday</SelectItem>
                      <SelectItem value="asap">ASAP - Any day works</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="preferredTime">Preferred Time (EST)</Label>
                  <Select
                    value={formData.preferredTime}
                    onValueChange={(value) => setFormData({ ...formData, preferredTime: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a time" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="morning">Morning (9am - 12pm)</SelectItem>
                      <SelectItem value="afternoon">Afternoon (12pm - 5pm)</SelectItem>
                      <SelectItem value="evening">Evening (5pm - 7pm)</SelectItem>
                      <SelectItem value="flexible">Flexible - Any time works</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Anything specific you want to cover? (Optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="E.g., I'm focused on HVAC contractors in Texas..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                />
              </div>

              <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Calendar className="mr-2 h-5 w-5" />
                    Request Setup Call
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Skip Option */}
        <div className="text-center">
          <p className="text-sm text-muted-foreground mb-3">
            Want to explore first? You can request your setup call later.
          </p>
          <Button variant="ghost" onClick={handleSkipForNow}>
            <Calendar className="h-4 w-4 mr-2" />
            Skip for now, explore the dashboard
          </Button>
          <p className="text-xs text-muted-foreground mt-2">
            Note: You'll need to complete a setup call before launching campaigns.
          </p>
        </div>
      </div>
    </div>
  );
}
