"use client";

import { sf, sfd } from "@/lib/utils/safe-format";
import { APP_NAME } from "@/config/title";
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
  Search,
  Phone,
  FileSearch,
  Settings,
  Headphones,
  Calendar,
  Sparkles,
} from "lucide-react";

// Calendly link for consultative sales
const CALENDLY_LINK = "https://calendly.com/nextier/demo";

const plans = [
  {
    name: "Starter",
    slug: "starter",
    description: "Perfect for solo agents getting started",
    priceMonthly: 297,
    priceYearly: 2970, // 2 months free
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
      users: -1, // unlimited
      leads: 50000,
      searches: -1,
      sms: 25000,
      skipTraces: 2500,
    },
  },
  {
    name: "Custom",
    slug: "custom",
    description: "Let's design something for you",
    priceMonthly: 0, // Contact for pricing
    priceYearly: 0,
    icon: Sparkles,
    popular: false,
    isCustom: true,
    features: [
      { text: "Tailored to your needs", included: true },
      { text: "Flexible user limits", included: true },
      { text: "Custom lead volumes", included: true },
      { text: "Volume SMS pricing", included: true },
      { text: "Bulk skip trace rates", included: true },
      { text: "Dedicated success manager", included: true },
      { text: "Custom integrations", included: true },
      { text: "SLA guarantees", included: true },
      { text: "Priority feature requests", included: true },
      { text: "Quarterly business reviews", included: true },
    ],
    limits: {
      users: -1,
      leads: -1,
      searches: -1,
      sms: -1,
      skipTraces: -1,
    },
  },
];

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
    // Redirect to checkout or signup
    router.push(
      `/signup?plan=${planSlug}&billing=${isYearly ? "yearly" : "monthly"}`,
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Header */}
      <div className="container mx-auto px-4 py-16 text-center">
        <Badge className="mb-4" variant="secondary">
          Pricing
        </Badge>
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl mb-4">
          Simple, Transparent Pricing
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
          Choose the perfect plan for your real estate business. All plans
          include our AI-powered research assistant and core platform features.
        </p>

        {/* Billing Toggle */}
        <div className="flex items-center justify-center gap-4 mb-12">
          <Label
            htmlFor="billing-toggle"
            className={!isYearly ? "font-semibold" : "text-muted-foreground"}
          >
            Monthly
          </Label>
          <Switch
            id="billing-toggle"
            checked={isYearly}
            onCheckedChange={setIsYearly}
          />
          <Label
            htmlFor="billing-toggle"
            className={isYearly ? "font-semibold" : "text-muted-foreground"}
          >
            Yearly
            <Badge variant="secondary" className="ml-2 text-xs">
              Save 17%
            </Badge>
          </Label>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="container mx-auto px-4 pb-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          {plans.map((plan) => {
            const Icon = plan.icon;
            const price = isYearly ? plan.priceYearly : plan.priceMonthly;
            const monthlyEquivalent = isYearly
              ? Math.round(plan.priceYearly / 12)
              : plan.priceMonthly;
            const isCustomPlan = (plan as any).isCustom;

            return (
              <Card
                key={plan.slug}
                className={`relative flex flex-col ${
                  plan.popular
                    ? "border-primary shadow-lg scale-105 z-10"
                    : "hover:border-primary/50"
                } ${isCustomPlan ? "bg-gradient-to-br from-primary/5 to-primary/10" : ""}`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground">
                      Most Popular
                    </Badge>
                  </div>
                )}

                <CardHeader className="text-center pb-2">
                  <div className="mx-auto mb-4 p-3 rounded-full bg-primary/10">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>

                <CardContent className="flex-1">
                  <div className="text-center mb-6">
                    {isCustomPlan ? (
                      <div>
                        <span className="text-2xl font-bold text-primary">
                          Let's Talk
                        </span>
                        <p className="text-sm text-muted-foreground mt-1">
                          Pricing based on your needs
                        </p>
                      </div>
                    ) : (
                      <>
                        <p className="text-xs text-muted-foreground mb-1">Starting at</p>
                        <div className="flex items-baseline justify-center gap-1">
                          <span className="text-4xl font-bold">
                            ${sf(monthlyEquivalent)}
                          </span>
                          <span className="text-muted-foreground">/mo</span>
                        </div>
                        {isYearly && (
                          <p className="text-sm text-muted-foreground mt-1">
                            ${sf(price)} billed annually
                          </p>
                        )}
                        {(plan as any).setupFee && (
                          <p className="text-sm text-orange-500 mt-1">
                            + ${sf((plan as any).setupFee)} one-time setup
                          </p>
                        )}
                      </>
                    )}
                  </div>

                  <ul className="space-y-3">
                    {plan.features.map((feature, idx) => (
                      <li
                        key={idx}
                        className={`flex items-center gap-2 text-sm ${
                          !feature.included ? "text-muted-foreground" : ""
                        }`}
                      >
                        <Check
                          className={`h-4 w-4 shrink-0 ${
                            feature.included
                              ? "text-green-500"
                              : "text-muted-foreground/30"
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

                <CardFooter className="flex-col gap-2">
                  {isCustomPlan ? (
                    <a href={CALENDLY_LINK} target="_blank" rel="noopener noreferrer" className="w-full">
                      <Button className="w-full" variant="default">
                        <Calendar className="h-4 w-4 mr-2" />
                        Schedule a Call
                      </Button>
                    </a>
                  ) : (
                    <>
                      <Button
                        className="w-full"
                        variant={plan.popular ? "default" : "outline"}
                        onClick={() => handleSelectPlan(plan.slug)}
                      >
                        Get Started
                      </Button>
                      <a href={CALENDLY_LINK} target="_blank" rel="noopener noreferrer" className="w-full">
                        <Button variant="ghost" className="w-full text-muted-foreground hover:text-foreground" size="sm">
                          <Calendar className="h-3 w-3 mr-1" />
                          Let's Talk
                        </Button>
                      </a>
                    </>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Add-ons Section */}
      <div className="container mx-auto px-4 pb-16">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold mb-2">Usage-Based Add-ons</h2>
          <p className="text-muted-foreground">
            Need more? Pay only for what you use beyond your plan limits.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {addOns.map((addon) => {
            const Icon = addon.icon;
            return (
              <Card key={addon.name} className="hover:border-primary/50">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-muted">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <CardTitle className="text-sm font-medium">
                        {addon.name}
                      </CardTitle>
                      <p className="text-primary font-semibold">
                        {addon.price}
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-sm text-muted-foreground">
                    {addon.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* FAQ or CTA */}
      <div className="container mx-auto px-4 pb-16">
        <Card className="bg-primary text-primary-foreground">
          <CardContent className="py-12 text-center">
            <h2 className="text-2xl font-bold mb-4">
              Ready to Transform Your Real Estate Business?
            </h2>
            <p className="text-primary-foreground/80 mb-6 max-w-xl mx-auto">
              Join hundreds of agents and brokerages already using {APP_NAME} to
              find more deals, close faster, and grow their business.
            </p>
            <div className="flex gap-4 justify-center">
              <Button
                variant="secondary"
                size="lg"
                onClick={() => router.push("/signup?plan=pro")}
              >
                Start Free Trial
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="bg-transparent border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10"
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
