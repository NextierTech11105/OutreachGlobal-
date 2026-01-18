"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  BarChart3,
  ExternalLink,
  CheckCircle2,
  ArrowRight,
  Shield,
  Users,
  Phone,
  Calendar,
  Sparkles,
  Zap,
  FileSpreadsheet,
  Mail,
} from "lucide-react";
import { toast } from "sonner";

/**
 * LEAD LAB - Public Lead Magnet Page
 * ═══════════════════════════════════════════════════════════════════════════════
 * Shareable link for contactability assessment
 *
 * FREE: Redirect to Trestle portal (aggregate stats, up to 10k records)
 * PAID: Per-lead results via NEXTIER pipeline (Tracerfy → Trestle Real Contact)
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// URLs
const TRESTLE_PORTAL = "https://portal.trestleiq.com/data-assessment";
const CALENDLY_LINK = "https://calendly.com/nextier/demo";

export default function LeadLabPage() {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Capture email and redirect to Trestle for FREE assessment
  const handleFreeAssessment = async () => {
    if (!email || !email.includes("@")) {
      toast.error("Please enter a valid email");
      return;
    }

    setIsSubmitting(true);

    try {
      // Capture the lead (fire and forget)
      fetch("/api/leads/capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          source: "lead-lab",
          tier: "free",
        }),
      }).catch(() => {}); // Silent fail

      setSubmitted(true);
      toast.success("Opening Trestle assessment...");

      // Open Trestle portal in new tab
      window.open(TRESTLE_PORTAL, "_blank");
    } catch {
      toast.error("Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Capture email and redirect to paid flow
  const handlePaidAssessment = async () => {
    if (!email || !email.includes("@")) {
      toast.error("Please enter a valid email");
      return;
    }

    setIsSubmitting(true);

    try {
      // Capture the lead
      fetch("/api/leads/capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          source: "lead-lab",
          tier: "paid",
        }),
      }).catch(() => {});

      toast.success("Let's talk about your needs!");
      window.open(CALENDLY_LINK, "_blank");
    } catch {
      toast.error("Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-50">
      {/* Header */}
      <header className="w-full flex justify-between items-center px-6 py-4 border-b border-slate-800">
        <Link href="/" className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-slate-950 flex items-center justify-center">
            <BarChart3 className="h-6 w-6 text-sky-400" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-lg font-bold text-slate-100">
              Lead<span className="text-sky-400">Lab</span>
            </span>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider">
              by Nextier
            </span>
          </div>
        </Link>
        <a href={CALENDLY_LINK} target="_blank" rel="noopener noreferrer">
          <Button variant="outline" size="sm" className="border-slate-700">
            <Calendar className="h-4 w-4 mr-2" />
            Book Demo
          </Button>
        </a>
      </header>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-4 py-16 text-center">
        <Badge className="mb-4 bg-sky-500/10 text-sky-400 border-sky-500/30">
          Free Contactability Audit
        </Badge>

        <h1 className="text-4xl md:text-5xl font-bold mb-4">
          Is Your Data Stopping{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-orange-400">
            Quality Engagement?
          </span>
        </h1>

        <p className="text-lg text-slate-400 mb-8 max-w-2xl mx-auto">
          Find out how your data scores on our Contactability Audit.
          Upload your list and get a free report in minutes.
        </p>

        {/* Email Capture */}
        <Card className="max-w-md mx-auto bg-slate-900/80 border-slate-700">
          <CardContent className="p-6">
            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="text-sm text-slate-400 block mb-2 text-left">
                  Enter your email to get started
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-slate-800 border-slate-700"
                />
              </div>

              {/* Two CTAs */}
              <div className="space-y-3">
                <Button
                  onClick={handleFreeAssessment}
                  disabled={isSubmitting}
                  className="w-full bg-gradient-to-r from-sky-500 to-sky-600 hover:opacity-90"
                  size="lg"
                >
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Free Assessment (up to 10k records)
                  <ExternalLink className="h-4 w-4 ml-2" />
                </Button>

                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <div className="flex-1 h-px bg-slate-700" />
                  <span>or</span>
                  <div className="flex-1 h-px bg-slate-700" />
                </div>

                <Button
                  onClick={handlePaidAssessment}
                  disabled={isSubmitting}
                  variant="outline"
                  className="w-full border-orange-500/50 text-orange-400 hover:bg-orange-500/10"
                  size="lg"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Per-Lead Results + Enrichment
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>

              <p className="text-xs text-slate-500">
                Free assessment powered by Trestle. No credit card required.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Submitted state */}
        {submitted && (
          <div className="mt-6 p-4 bg-green-500/10 border border-green-500/30 rounded-lg max-w-md mx-auto">
            <div className="flex items-center gap-2 text-green-400">
              <CheckCircle2 className="h-5 w-5" />
              <span>Trestle portal opened in new tab</span>
            </div>
            <p className="text-sm text-slate-400 mt-2">
              Upload your CSV there and you'll receive your report via email.
            </p>
          </div>
        )}
      </section>

      {/* Comparison */}
      <section className="max-w-4xl mx-auto px-4 pb-16">
        <h2 className="text-2xl font-bold text-center mb-8">
          Choose Your Assessment Level
        </h2>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Free Tier */}
          <Card className="bg-slate-900/50 border-slate-700">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 rounded-lg bg-sky-500/10">
                  <BarChart3 className="h-5 w-5 text-sky-400" />
                </div>
                <div>
                  <h3 className="font-semibold">Free Assessment</h3>
                  <Badge variant="outline" className="text-xs">via Trestle</Badge>
                </div>
              </div>

              <ul className="space-y-3 mb-6">
                {[
                  "Up to 10,000 records",
                  "Aggregate statistics",
                  "Grade distribution (A-F)",
                  "Peer comparison",
                  "Report via email",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm text-slate-300">
                    <CheckCircle2 className="h-4 w-4 text-sky-400 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>

              <div className="text-center">
                <p className="text-3xl font-bold text-sky-400">FREE</p>
                <p className="text-xs text-slate-500">No credit card</p>
              </div>
            </CardContent>
          </Card>

          {/* Paid Tier */}
          <Card className="bg-slate-900/50 border-orange-500/30 ring-1 ring-orange-500/20">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 rounded-lg bg-orange-500/10">
                  <Zap className="h-5 w-5 text-orange-400" />
                </div>
                <div>
                  <h3 className="font-semibold">Full Enrichment</h3>
                  <Badge className="text-xs bg-orange-500/20 text-orange-400 border-orange-500/30">
                    NEXTIER Pipeline
                  </Badge>
                </div>
              </div>

              <ul className="space-y-3 mb-6">
                {[
                  "Unlimited records",
                  "Per-lead results",
                  "Skip trace (find owner mobile)",
                  "Contactability scoring",
                  "Litigator risk check",
                  "CSV export with all data",
                  "Push to SMS campaign",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm text-slate-300">
                    <CheckCircle2 className="h-4 w-4 text-orange-400 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>

              <div className="text-center">
                <p className="text-3xl font-bold text-orange-400">$0.05<span className="text-lg">/lead</span></p>
                <p className="text-xs text-slate-500">Tracerfy + Trestle</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* How It Works */}
      <section className="max-w-4xl mx-auto px-4 pb-16">
        <h2 className="text-2xl font-bold text-center mb-8">How It Works</h2>

        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              icon: Mail,
              title: "1. Enter Email",
              description: "We'll send you updates and tips on lead quality.",
            },
            {
              icon: FileSpreadsheet,
              title: "2. Upload CSV",
              description: "Names + phone numbers required. Email optional.",
            },
            {
              icon: BarChart3,
              title: "3. Get Report",
              description: "See grade distribution, activity scores, and more.",
            },
          ].map((step) => (
            <Card key={step.title} className="bg-slate-900/30 border-slate-800">
              <CardContent className="p-6 text-center">
                <div className="inline-flex p-3 rounded-lg bg-slate-800 mb-4">
                  <step.icon className="h-6 w-6 text-sky-400" />
                </div>
                <h3 className="font-semibold mb-2">{step.title}</h3>
                <p className="text-sm text-slate-400">{step.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Trust */}
      <section className="max-w-4xl mx-auto px-4 pb-16">
        <div className="flex flex-wrap justify-center gap-8 text-slate-500 text-sm">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            <span>Data deleted after processing</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span>Powered by Trestle Real Contact</span>
          </div>
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4" />
            <span>TCPA compliant</span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-6">
        <div className="container mx-auto px-4 text-center text-sm text-slate-500">
          <p>Lead Lab by NEXTIER</p>
          <div className="flex justify-center gap-4 mt-2">
            <Link href="/terms" className="hover:text-slate-300">Terms</Link>
            <Link href="/privacy" className="hover:text-slate-300">Privacy</Link>
            <a href={CALENDLY_LINK} className="hover:text-slate-300">Contact</a>
          </div>
        </div>
      </footer>
    </main>
  );
}
