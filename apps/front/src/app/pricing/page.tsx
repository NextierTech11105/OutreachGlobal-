"use client";

import { sf } from "@/lib/utils/safe-format";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Check,
  Zap,
  Building2,
  Crown,
  Rocket,
  Users,
  MessageSquare,
  FileSearch,
  Headphones,
  Code,
  Terminal,
  Webhook,
  Shield,
} from "lucide-react";
import { NextierLogo } from "@/components/brand/nextier-logo";

const plans = [
  {
    name: "Starter",
    slug: "starter",
    description: "Perfect for solo agents getting started",
    priceMonthly: 297,
    priceYearly: 2970,
    icon: Rocket,
    popular: false,
    features: [
      { text: "1 User", included: true },
      { text: "1,000 Leads/month", included: true },
      { text: "500 Property Searches", included: true },
      { text: "500 SMS Messages", included: true },
      { text: "50 Skip Traces", included: true },
      { text: "AI Research Assistant", included: true },
      { text: "Email Support", included: true },
      { text: "Power Dialer", included: false },
      { text: "API Access", included: false },
      { text: "White Label", included: false },
    ],
    limits: {
      users: 1,
      leads: 1000,
      searches: 500,
      sms: 500,
      skipTraces: 50,
    },
  },
  {
    name: "Pro",
    slug: "pro",
    description: "For growing teams ready to scale",
    priceMonthly: 597,
    priceYearly: 5970,
    icon: Zap,
    popular: true,
    features: [
      { text: "3 Users", included: true },
      { text: "5,000 Leads/month", included: true },
      { text: "2,500 Property Searches", included: true },
      { text: "2,500 SMS Messages", included: true },
      { text: "250 Skip Traces", included: true },
      { text: "AI Research Assistant", included: true },
      { text: "Priority Support", included: true },
      { text: "Power Dialer", included: true },
      { text: "API Access", included: false },
      { text: "White Label", included: false },
    ],
    limits: {
      users: 3,
      leads: 5000,
      searches: 2500,
      sms: 2500,
      skipTraces: 250,
    },
  },
  {
    name: "Agency",
    slug: "agency",
    description: "For established teams and brokerages",
    priceMonthly: 1497,
    priceYearly: 14970,
    icon: Building2,
    popular: false,
    features: [
      { text: "10 Users", included: true },
      { text: "25,000 Leads/month", included: true },
      { text: "10,000 Property Searches", included: true },
      { text: "10,000 SMS Messages", included: true },
      { text: "1,000 Skip Traces", included: true },
      { text: "AI Research Assistant", included: true },
      { text: "Dedicated Support", included: true },
      { text: "Power Dialer", included: true },
      { text: "API Access", included: true },
      { text: "White Label", included: false },
    ],
    limits: {
      users: 10,
      leads: 25000,
      searches: 10000,
      sms: 10000,
      skipTraces: 1000,
    },
  },
  {
    name: "White-Label",
    slug: "white-label",
    description: "Your brand, our technology",
    priceMonthly: 2997,
    priceYearly: 29970,
    icon: Crown,
    popular: false,
    setupFee: 5000,
    features: [
      { text: "Unlimited Users", included: true },
      { text: "50,000 Leads/month", included: true },
      { text: "Unlimited Property Searches", included: true },
      { text: "25,000 SMS Messages", included: true },
      { text: "2,500 Skip Traces", included: true },
      { text: "Custom AI Persona", included: true },
      { text: "White-Glove Onboarding", included: true },
      { text: "Power Dialer", included: true },
      { text: "Full API Access", included: true },
      { text: "Custom Branding", included: true },
    ],
    limits: {
      users: -1,
      leads: 50000,
      searches: -1,
      sms: 25000,
      skipTraces: 2500,
    },
  },
];

// Developer License - Annual Only
const developerPlan = {
  name: "Developer",
  slug: "developer",
  description: "Full API access for integrators",
  priceAnnual: 2997,
  icon: Code,
  features: [
    { text: "Full REST API Access", icon: Terminal },
    { text: "10,000 API Requests/day", icon: Zap },
    { text: "Outbound Webhooks", icon: Webhook },
    { text: "5,000 Lead Enrichments/mo", icon: FileSearch },
    { text: "1,000 Skip Traces/mo", icon: FileSearch },
    { text: "500 NEVA Research/mo", icon: Zap },
    { text: "2,500 SMS/mo", icon: MessageSquare },
    { text: "500 Voice Minutes/mo", icon: Headphones },
    { text: "Developer Discord", icon: Users },
    { text: "99.5% Uptime SLA", icon: Shield },
  ],
  overages: [
    { name: "Lead Enrichment", price: "$0.10/call" },
    { name: "Skip Trace", price: "$0.50/call" },
    { name: "NEVA Research", price: "$1.00/call" },
    { name: "SMS", price: "$0.03/msg" },
    { name: "Voice", price: "$0.05/min" },
  ],
};

const addOns = [
  {
    name: "Additional SMS",
    price: "$0.02/message",
    description: "Pay-as-you-go SMS beyond your plan limit",
    icon: MessageSquare,
  },
  {
    name: "Extra Skip Traces",
    price: "$0.50/trace",
    description: "Additional skip traces at volume pricing",
    icon: FileSearch,
  },
  {
    name: "Additional Users",
    price: "$49/user/mo",
    description: "Add team members to your plan",
    icon: Users,
  },
  {
    name: "Premium Support",
    price: "$199/mo",
    description: "24/7 phone support with dedicated account manager",
    icon: Headphones,
  },
];

export default function PricingPage() {
  const router = useRouter();
  const [isYearly, setIsYearly] = useState(false);

  const handleSelectPlan = async (planSlug: string) => {
    router.push(
      `/signup?plan=${planSlug}&billing=${isYearly ? "yearly" : "monthly"}`
    );
  };

  return (
    <div className="min-h-screen bg-[#0F172A]">
      {/* Header */}
      <div className="container mx-auto px-4 py-16 text-center">
        <div className="flex justify-center mb-8">
          <NextierLogo size="lg" />
        </div>
        <Badge className="mb-4 bg-cyan-500/20 text-cyan-400 border-cyan-500/30">
          Pricing
        </Badge>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl mb-4 text-white">
          Simple, Transparent Pricing
        </h1>
        <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-8">
          Choose the perfect plan for your business. All plans include our
          AI-powered research assistant and core platform features.
        </p>

        {/* Billing Toggle */}
        <div className="flex items-center justify-center gap-4 mb-12">
          <Label
            htmlFor="billing-toggle"
            className={!isYearly ? "font-semibold text-white" : "text-slate-500"}
          >
            Monthly
          </Label>
          <Switch
            id="billing-toggle"
            checked={isYearly}
            onCheckedChange={setIsYearly}
            className="data-[state=checked]:bg-cyan-500"
          />
          <Label
            htmlFor="billing-toggle"
            className={isYearly ? "font-semibold text-white" : "text-slate-500"}
          >
            Yearly
            <Badge className="ml-2 text-xs bg-gradient-to-r from-orange-500 to-red-500 text-white border-0">
              Save 17%
            </Badge>
          </Label>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="container mx-auto px-4 pb-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan) => {
            const Icon = plan.icon;
            const price = isYearly ? plan.priceYearly : plan.priceMonthly;
            const monthlyEquivalent = isYearly
              ? Math.round(plan.priceYearly / 12)
              : plan.priceMonthly;

            return (
              <Card
                key={plan.slug}
                className={`relative flex flex-col bg-slate-900/50 border-slate-700/50 backdrop-blur ${
                  plan.popular
                    ? "border-cyan-500 shadow-lg shadow-cyan-500/20 scale-105 z-10"
                    : "hover:border-slate-600"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white border-0">
                      Most Popular
                    </Badge>
                  </div>
                )}

                <CardHeader className="text-center pb-2">
                  <div
                    className={`mx-auto mb-4 p-3 rounded-full ${
                      plan.popular
                        ? "bg-gradient-to-br from-cyan-500/20 to-blue-500/20"
                        : "bg-slate-800"
                    }`}
                  >
                    <Icon
                      className={`h-6 w-6 ${
                        plan.popular ? "text-cyan-400" : "text-slate-400"
                      }`}
                    />
                  </div>
                  <CardTitle className="text-xl text-white">
                    {plan.name}
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    {plan.description}
                  </CardDescription>
                </CardHeader>

                <CardContent className="flex-1">
                  <div className="text-center mb-6">
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-4xl font-bold text-white">
                        ${sf(monthlyEquivalent)}
                      </span>
                      <span className="text-slate-500">/mo</span>
                    </div>
                    {isYearly && (
                      <p className="text-sm text-slate-500 mt-1">
                        ${sf(price)} billed annually
                      </p>
                    )}
                    {plan.setupFee && (
                      <p className="text-sm text-orange-400 mt-1">
                        + ${sf(plan.setupFee)} one-time setup
                      </p>
                    )}
                  </div>

                  <ul className="space-y-3">
                    {plan.features.map((feature, idx) => (
                      <li
                        key={idx}
                        className={`flex items-center gap-2 text-sm ${
                          !feature.included ? "text-slate-600" : "text-slate-300"
                        }`}
                      >
                        <Check
                          className={`h-4 w-4 shrink-0 ${
                            feature.included
                              ? "text-cyan-500"
                              : "text-slate-700"
                          }`}
                        />
                        <span
                          className={!feature.included ? "line-through" : ""}
                        >
                          {feature.text}
                        </span>
                      </li>
                    ))}
                  </ul>
                </CardContent>

                <CardFooter>
                  <Button
                    className={`w-full ${
                      plan.popular
                        ? "bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white"
                        : "bg-slate-800 hover:bg-slate-700 text-white border-slate-700"
                    }`}
                    variant={plan.popular ? "default" : "outline"}
                    onClick={() => handleSelectPlan(plan.slug)}
                  >
                    {plan.slug === "white-label"
                      ? "Contact Sales"
                      : "Get Started"}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Developer License Section */}
      <div className="container mx-auto px-4 pb-16">
        <div className="text-center mb-8">
          <Badge className="mb-4 bg-orange-500/20 text-orange-400 border-orange-500/30">
            For Developers
          </Badge>
          <h2 className="text-3xl font-bold mb-2 text-white">
            Developer License
          </h2>
          <p className="text-slate-400">
            Full API access for integrators, agencies, and resellers. Annual
            license.
          </p>
        </div>

        <Card className="max-w-4xl mx-auto bg-gradient-to-br from-slate-900 via-slate-900 to-slate-800 border-orange-500/30 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 via-transparent to-cyan-500/5" />
          <CardHeader className="relative">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-gradient-to-br from-orange-500/20 to-red-500/20">
                  <Code className="h-8 w-8 text-orange-400" />
                </div>
                <div>
                  <CardTitle className="text-2xl text-white">
                    {developerPlan.name}
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    {developerPlan.description}
                  </CardDescription>
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent">
                    ${sf(developerPlan.priceAnnual)}
                  </span>
                  <span className="text-slate-500">/year</span>
                </div>
                <p className="text-sm text-slate-500">
                  ${sf(Math.round(developerPlan.priceAnnual / 12))}/mo billed
                  annually
                </p>
              </div>
            </div>
          </CardHeader>

          <CardContent className="relative">
            <div className="grid md:grid-cols-2 gap-8">
              {/* Features */}
              <div>
                <h4 className="text-sm font-semibold text-slate-300 mb-4 uppercase tracking-wider">
                  What's Included
                </h4>
                <ul className="space-y-3">
                  {developerPlan.features.map((feature, idx) => {
                    const FeatureIcon = feature.icon;
                    return (
                      <li
                        key={idx}
                        className="flex items-center gap-3 text-slate-300"
                      >
                        <FeatureIcon className="h-4 w-4 text-orange-400 shrink-0" />
                        <span>{feature.text}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>

              {/* Overages */}
              <div>
                <h4 className="text-sm font-semibold text-slate-300 mb-4 uppercase tracking-wider">
                  Usage-Based Overages
                </h4>
                <div className="space-y-2">
                  {developerPlan.overages.map((overage, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between py-2 border-b border-slate-800"
                    >
                      <span className="text-slate-400">{overage.name}</span>
                      <span className="text-orange-400 font-mono">
                        {overage.price}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="mt-6 p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                  <h5 className="text-sm font-semibold text-white mb-2">
                    API Endpoints Include:
                  </h5>
                  <code className="text-xs text-cyan-400 block space-y-1">
                    <div>/api/v1/leads</div>
                    <div>/api/v1/enrich</div>
                    <div>/api/v1/neva</div>
                    <div>/api/v1/sms</div>
                    <div>/api/v1/calls</div>
                    <div>/api/v1/webhooks</div>
                  </code>
                </div>
              </div>
            </div>
          </CardContent>

          <CardFooter className="relative">
            <Button
              className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white text-lg py-6"
              onClick={() => handleSelectPlan("developer")}
            >
              Get Developer License
            </Button>
          </CardFooter>
        </Card>
      </div>

      {/* Add-ons Section */}
      <div className="container mx-auto px-4 pb-16">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold mb-2 text-white">
            Usage-Based Add-ons
          </h2>
          <p className="text-slate-400">
            Need more? Pay only for what you use beyond your plan limits.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {addOns.map((addon) => {
            const Icon = addon.icon;
            return (
              <Card
                key={addon.name}
                className="bg-slate-900/50 border-slate-700/50 hover:border-slate-600"
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-slate-800">
                      <Icon className="h-4 w-4 text-slate-400" />
                    </div>
                    <div>
                      <CardTitle className="text-sm font-medium text-white">
                        {addon.name}
                      </CardTitle>
                      <p className="text-cyan-400 font-semibold">
                        {addon.price}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-sm text-slate-500">{addon.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* CTA */}
      <div className="container mx-auto px-4 pb-16">
        <Card className="bg-gradient-to-r from-blue-600 via-cyan-600 to-blue-600 border-0 overflow-hidden">
          <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
          <CardContent className="relative py-12 text-center">
            <h2 className="text-2xl font-bold mb-4 text-white">
              Ready to Transform Your Business?
            </h2>
            <p className="text-blue-100 mb-6 max-w-xl mx-auto">
              Join hundreds of teams already using NEXTIER to find more deals,
              close faster, and grow their business.
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
              <Button
                size="lg"
                className="bg-white text-blue-600 hover:bg-blue-50"
                onClick={() => router.push("/signup?plan=pro")}
              >
                Start Free Trial
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="bg-transparent border-white/30 text-white hover:bg-white/10"
                onClick={() => router.push("/contact")}
              >
                Talk to Sales
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
