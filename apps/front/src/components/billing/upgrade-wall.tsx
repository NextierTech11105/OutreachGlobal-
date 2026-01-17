"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Zap, Lock, ArrowRight, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * UPGRADE WALL COMPONENT
 * ═══════════════════════════════════════════════════════════════════════════
 * Displayed when a user's trial has expired.
 * Shows pricing plans and allows selection for checkout.
 * ═══════════════════════════════════════════════════════════════════════════
 */

interface Plan {
  id: string;
  slug: string;
  name: string;
  description: string;
  priceMonthly: number;
  priceYearly: number;
  features: { text: string; included: boolean }[];
  popular?: boolean;
}

const DEFAULT_PLANS: Plan[] = [
  {
    id: "starter",
    slug: "starter",
    name: "Starter",
    description: "Perfect for small teams getting started",
    priceMonthly: 99,
    priceYearly: 990,
    features: [
      { text: "Up to 5,000 leads", included: true },
      { text: "1,000 SMS/month", included: true },
      { text: "Power Dialer", included: true },
      { text: "3 Team Members", included: true },
      { text: "Email Support", included: true },
      { text: "API Access", included: false },
      { text: "White Label", included: false },
    ],
  },
  {
    id: "pro",
    slug: "pro",
    name: "Pro",
    description: "For growing teams that need more power",
    priceMonthly: 249,
    priceYearly: 2490,
    popular: true,
    features: [
      { text: "Up to 25,000 leads", included: true },
      { text: "5,000 SMS/month", included: true },
      { text: "Power Dialer", included: true },
      { text: "10 Team Members", included: true },
      { text: "Priority Support", included: true },
      { text: "API Access", included: true },
      { text: "White Label", included: false },
    ],
  },
  {
    id: "agency",
    slug: "agency",
    name: "Agency",
    description: "For agencies managing multiple clients",
    priceMonthly: 499,
    priceYearly: 4990,
    features: [
      { text: "Unlimited leads", included: true },
      { text: "Unlimited SMS", included: true },
      { text: "Power Dialer", included: true },
      { text: "Unlimited Team Members", included: true },
      { text: "Dedicated Support", included: true },
      { text: "API Access", included: true },
      { text: "White Label", included: true },
    ],
  },
];

interface UpgradeWallProps {
  /** Optional custom plans to display */
  plans?: Plan[];
  /** Callback when user selects a plan */
  onSelectPlan?: (plan: Plan, billingCycle: "monthly" | "yearly") => void;
  /** Whether to show the full page version or inline version */
  variant?: "full" | "inline";
  /** Optional message to display */
  message?: string;
}

export function UpgradeWall({
  plans = DEFAULT_PLANS,
  onSelectPlan,
  variant = "full",
  message,
}: UpgradeWallProps) {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  const handleSelectPlan = (plan: Plan) => {
    setSelectedPlan(plan.id);
    if (onSelectPlan) {
      onSelectPlan(plan, billingCycle);
    } else {
      // Default behavior: redirect to checkout
      window.location.href = `/checkout?plan=${plan.slug}&cycle=${billingCycle}`;
    }
  };

  const getPrice = (plan: Plan) => {
    return billingCycle === "monthly" ? plan.priceMonthly : Math.round(plan.priceYearly / 12);
  };

  if (variant === "inline") {
    return (
      <div className="p-6 border rounded-lg bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-950/20 dark:to-orange-950/20">
        <div className="flex items-center gap-2 mb-4">
          <Lock className="h-5 w-5 text-red-500" />
          <span className="font-bold text-lg">
            {message || "Your trial has expired"}
          </span>
        </div>
        <p className="text-muted-foreground mb-4">
          Upgrade now to continue accessing all features and keep your data safe.
        </p>
        <Button onClick={() => window.location.href = "/upgrade"}>
          View Plans
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-br from-background to-muted/30">
      {/* Header */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 mb-4">
          <Lock className="h-4 w-4" />
          <span className="text-sm font-medium">Trial Expired</span>
        </div>
        <h1 className="text-4xl font-bold mb-4">
          {message || "Upgrade to Continue"}
        </h1>
        <p className="text-xl text-muted-foreground max-w-lg mx-auto">
          Your 14-day trial has ended. Choose a plan to keep your leads, campaigns, and data.
        </p>
      </div>

      {/* Billing Toggle */}
      <div className="flex items-center gap-4 mb-8 p-1 bg-muted rounded-lg">
        <button
          onClick={() => setBillingCycle("monthly")}
          className={cn(
            "px-4 py-2 rounded-md text-sm font-medium transition-colors",
            billingCycle === "monthly"
              ? "bg-background shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Monthly
        </button>
        <button
          onClick={() => setBillingCycle("yearly")}
          className={cn(
            "px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2",
            billingCycle === "yearly"
              ? "bg-background shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Yearly
          <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
            Save 17%
          </Badge>
        </button>
      </div>

      {/* Plans Grid */}
      <div className="grid md:grid-cols-3 gap-6 max-w-5xl w-full">
        {plans.map((plan) => (
          <Card
            key={plan.id}
            className={cn(
              "relative transition-all hover:shadow-lg",
              plan.popular && "border-primary shadow-md",
              selectedPlan === plan.id && "ring-2 ring-primary"
            )}
          >
            {plan.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge className="bg-primary">
                  <Sparkles className="h-3 w-3 mr-1" />
                  Most Popular
                </Badge>
              </div>
            )}

            <CardHeader>
              <CardTitle>{plan.name}</CardTitle>
              <CardDescription>{plan.description}</CardDescription>
            </CardHeader>

            <CardContent>
              <div className="mb-6">
                <span className="text-4xl font-bold">${getPrice(plan)}</span>
                <span className="text-muted-foreground">/month</span>
                {billingCycle === "yearly" && (
                  <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                    Billed ${plan.priceYearly}/year
                  </p>
                )}
              </div>

              <ul className="space-y-3">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-center gap-2">
                    {feature.included ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <span className="h-4 w-4 text-muted-foreground">-</span>
                    )}
                    <span
                      className={cn(
                        "text-sm",
                        !feature.included && "text-muted-foreground"
                      )}
                    >
                      {feature.text}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>

            <CardFooter>
              <Button
                onClick={() => handleSelectPlan(plan)}
                className="w-full"
                variant={plan.popular ? "default" : "outline"}
              >
                <Zap className="mr-2 h-4 w-4" />
                Choose {plan.name}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      {/* Trust badges */}
      <div className="flex items-center gap-6 mt-10 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <Check className="h-4 w-4 text-green-500" />
          <span>Cancel anytime</span>
        </div>
        <div className="flex items-center gap-2">
          <Check className="h-4 w-4 text-green-500" />
          <span>Secure payment</span>
        </div>
        <div className="flex items-center gap-2">
          <Check className="h-4 w-4 text-green-500" />
          <span>30-day guarantee</span>
        </div>
      </div>
    </div>
  );
}
