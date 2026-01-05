"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Rocket, Check, Shield, Zap, Users, BarChart3 } from "lucide-react";

export default function GetStartedPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleCheckout = async (priceId: string) => {
    if (!email || !email.includes("@")) {
      setError("Please enter a valid email address");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/stripe/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          priceId,
          customerEmail: email,
          successUrl: `${window.location.origin}/get-started/success?session_id={CHECKOUT_SESSION_ID}`,
          cancelUrl: `${window.location.origin}/get-started`,
          metadata: {
            source: "landing_page",
            productPack: "FULL_PLATFORM",
          },
        }),
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error || "Failed to create checkout session");
      }
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <div className="border-b border-white/10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="text-xl font-bold text-white">OutreachGlobal</div>
          <a
            href="/auth/login"
            className="text-sm text-white/70 hover:text-white"
          >
            Already have a key? Sign in
          </a>
        </div>
      </div>

      {/* Hero */}
      <div className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full text-sm text-white/80 mb-8">
            <Rocket className="w-4 h-4" />
            No login required. Pay once, get your API key.
          </div>

          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 leading-tight">
            B2B Outreach
            <br />
            <span className="bg-gradient-to-r from-violet-400 to-purple-400 bg-clip-text text-transparent">
              On Autopilot
            </span>
          </h1>

          <p className="text-xl text-white/70 mb-12 max-w-2xl mx-auto">
            Prospect, message, and close deals with AI-powered outreach. No
            complicated setup. Just pay, get your API key, and start selling.
          </p>

          {/* Email Input */}
          <div className="max-w-md mx-auto mb-8">
            <div className="flex gap-3">
              <Input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-white/10 border-white/20 text-white placeholder:text-white/40 h-12"
              />
            </div>
            {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto mt-12">
          {/* Monthly */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-8">
            <div className="text-white/60 text-sm uppercase tracking-wider mb-2">
              Monthly
            </div>
            <div className="flex items-baseline gap-2 mb-6">
              <span className="text-5xl font-bold text-white">$497</span>
              <span className="text-white/60">/month</span>
            </div>
            <ul className="space-y-3 mb-8">
              {[
                "Full platform access",
                "AI SDR workers",
                "Unlimited campaigns",
                "Phone & SMS outreach",
                "Data enrichment",
                "API access included",
              ].map((feature) => (
                <li key={feature} className="flex items-center gap-3 text-white/80">
                  <Check className="w-5 h-5 text-green-400 flex-shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>
            <Button
              onClick={() => handleCheckout(process.env.NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID || "price_monthly")}
              disabled={loading}
              className="w-full h-12 bg-white text-slate-900 hover:bg-white/90 font-semibold"
            >
              {loading ? "Loading..." : "Get Started Monthly"}
            </Button>
          </div>

          {/* Annual */}
          <div className="bg-gradient-to-br from-violet-600/20 to-purple-600/20 border border-violet-500/30 rounded-2xl p-8 relative">
            <div className="absolute -top-3 right-6 bg-gradient-to-r from-violet-500 to-purple-500 text-white text-xs font-bold px-3 py-1 rounded-full">
              SAVE 20%
            </div>
            <div className="text-violet-300 text-sm uppercase tracking-wider mb-2">
              Annual
            </div>
            <div className="flex items-baseline gap-2 mb-6">
              <span className="text-5xl font-bold text-white">$397</span>
              <span className="text-white/60">/month</span>
            </div>
            <ul className="space-y-3 mb-8">
              {[
                "Everything in Monthly",
                "Priority support",
                "Strategy session included",
                "Early access to features",
                "Custom integrations",
                "Dedicated success manager",
              ].map((feature) => (
                <li key={feature} className="flex items-center gap-3 text-white/80">
                  <Check className="w-5 h-5 text-violet-400 flex-shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>
            <Button
              onClick={() => handleCheckout(process.env.NEXT_PUBLIC_STRIPE_ANNUAL_PRICE_ID || "price_annual")}
              disabled={loading}
              className="w-full h-12 bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 font-semibold"
            >
              {loading ? "Loading..." : "Get Started Annual"}
            </Button>
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-4 gap-6 max-w-4xl mx-auto mt-20">
          {[
            { icon: Shield, title: "Secure", desc: "API key based access" },
            { icon: Zap, title: "Instant", desc: "Key delivered via email" },
            { icon: Users, title: "AI Workers", desc: "GIANNA, CATHY & more" },
            { icon: BarChart3, title: "Analytics", desc: "Full pipeline visibility" },
          ].map((f) => (
            <div key={f.title} className="text-center">
              <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center mx-auto mb-3">
                <f.icon className="w-6 h-6 text-violet-400" />
              </div>
              <div className="text-white font-semibold mb-1">{f.title}</div>
              <div className="text-white/60 text-sm">{f.desc}</div>
            </div>
          ))}
        </div>

        {/* How it works */}
        <div className="max-w-3xl mx-auto mt-20 text-center">
          <h2 className="text-2xl font-bold text-white mb-8">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: "1", title: "Enter Email", desc: "No account needed" },
              { step: "2", title: "Pay via Stripe", desc: "Secure checkout" },
              { step: "3", title: "Get API Key", desc: "Emailed instantly" },
            ].map((s) => (
              <div key={s.step} className="relative">
                <div className="w-10 h-10 rounded-full bg-violet-500 text-white font-bold flex items-center justify-center mx-auto mb-4">
                  {s.step}
                </div>
                <div className="text-white font-semibold mb-1">{s.title}</div>
                <div className="text-white/60 text-sm">{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-white/10 mt-20">
        <div className="max-w-6xl mx-auto px-6 py-8 text-center text-white/40 text-sm">
          Questions? Email{" "}
          <a href="mailto:tb@outreachglobal.io" className="text-white/60 hover:text-white">
            tb@outreachglobal.io
          </a>
        </div>
      </div>
    </div>
  );
}
