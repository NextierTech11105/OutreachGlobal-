"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  CheckCircle,
  Circle,
  Loader2,
  CreditCard,
  Package,
  Webhook,
  TestTube,
  ArrowRight,
  ArrowLeft,
  ExternalLink,
  Copy,
  Check,
  AlertCircle,
} from "lucide-react";

interface WizardStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  completed: boolean;
}

export function StripeOnboardingWizard({ onComplete }: { onComplete?: () => void }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Form state
  const [secretKey, setSecretKey] = useState("");
  const [publishableKey, setPublishableKey] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");

  // Results state
  const [connectionResult, setConnectionResult] = useState<any>(null);
  const [productsCreated, setProductsCreated] = useState<any[]>([]);

  const webhookUrl = typeof window !== "undefined"
    ? `${window.location.origin}/api/billing/webhook`
    : "";

  const steps: WizardStep[] = [
    {
      id: "connect",
      title: "Connect Stripe",
      description: "Enter your API keys",
      icon: <CreditCard className="h-5 w-5" />,
      completed: !!connectionResult?.success,
    },
    {
      id: "products",
      title: "Create Products",
      description: "Set up pricing plans",
      icon: <Package className="h-5 w-5" />,
      completed: productsCreated.length > 0,
    },
    {
      id: "webhook",
      title: "Setup Webhook",
      description: "Configure event notifications",
      icon: <Webhook className="h-5 w-5" />,
      completed: !!webhookSecret,
    },
    {
      id: "test",
      title: "Test & Finish",
      description: "Verify everything works",
      icon: <TestTube className="h-5 w-5" />,
      completed: false,
    },
  ];

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const testConnection = async () => {
    if (!secretKey.trim()) {
      setError("Please enter your Stripe Secret Key");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/stripe/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secretKey }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Connection failed");
      }

      setConnectionResult(data);
      setCurrentStep(1);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const createProducts = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/stripe/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create-defaults" }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create products");
      }

      setProductsCreated(data.products);
      setCurrentStep(2);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleWebhookContinue = () => {
    setCurrentStep(3);
  };

  const handleFinish = () => {
    onComplete?.();
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-6">
            <Alert>
              <CreditCard className="h-4 w-4" />
              <AlertDescription>
                Get your API keys from{" "}
                <a
                  href="https://dashboard.stripe.com/apikeys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline font-medium"
                >
                  Stripe Dashboard → Developers → API Keys
                  <ExternalLink className="inline h-3 w-3 ml-1" />
                </a>
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Secret Key (starts with sk_)</Label>
                <Input
                  type="password"
                  value={secretKey}
                  onChange={(e) => setSecretKey(e.target.value)}
                  placeholder="sk_live_xxxxxxxxxxxxx or sk_test_xxxxxxxxxxxxx"
                />
                <p className="text-xs text-muted-foreground">
                  Use sk_test_ for testing, sk_live_ for production
                </p>
              </div>

              <div className="space-y-2">
                <Label>Publishable Key (starts with pk_)</Label>
                <Input
                  type="text"
                  value={publishableKey}
                  onChange={(e) => setPublishableKey(e.target.value)}
                  placeholder="pk_live_xxxxxxxxxxxxx or pk_test_xxxxxxxxxxxxx"
                />
              </div>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {connectionResult?.success && (
              <Alert className="bg-green-500/10 border-green-500/20">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <AlertDescription className="text-green-400">
                  Connected to {connectionResult.account.businessName}!
                  <br />
                  <span className="text-xs">
                    Balance: {connectionResult.stats.balance} |
                    Products: {connectionResult.stats.products}
                  </span>
                </AlertDescription>
              </Alert>
            )}

            <Button
              onClick={testConnection}
              disabled={loading || !secretKey.trim()}
              className="w-full"
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ArrowRight className="mr-2 h-4 w-4" />
              )}
              Test Connection & Continue
            </Button>
          </div>
        );

      case 1:
        return (
          <div className="space-y-6">
            <Alert>
              <Package className="h-4 w-4" />
              <AlertDescription>
                We&apos;ll create 3 subscription plans in your Stripe account:
                Starter ($99/mo), Professional ($299/mo), Enterprise ($799/mo)
              </AlertDescription>
            </Alert>

            {productsCreated.length > 0 ? (
              <div className="space-y-3">
                <p className="text-sm font-medium text-green-500">
                  ✓ Products created successfully!
                </p>
                {productsCreated.map((product) => (
                  <div
                    key={product.product.id}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <span className="font-medium">{product.product.name}</span>
                    <Badge variant="outline">{product.product.id}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { name: "Starter", price: "$99/mo" },
                    { name: "Professional", price: "$299/mo" },
                    { name: "Enterprise", price: "$799/mo" },
                  ].map((plan) => (
                    <Card key={plan.name}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg">{plan.name}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-2xl font-bold">{plan.price}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setCurrentStep(0)}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button
                onClick={productsCreated.length > 0 ? () => setCurrentStep(2) : createProducts}
                disabled={loading}
                className="flex-1"
              >
                {loading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <ArrowRight className="mr-2 h-4 w-4" />
                )}
                {productsCreated.length > 0 ? "Continue" : "Create Products"}
              </Button>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <Alert>
              <Webhook className="h-4 w-4" />
              <AlertDescription>
                Set up a webhook so Stripe can notify your app about payments
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <div>
                <Label>Step 1: Copy this webhook URL</Label>
                <div className="flex gap-2 mt-2">
                  <Input value={webhookUrl} readOnly className="font-mono text-sm" />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(webhookUrl)}
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div>
                <Label>Step 2: Add webhook in Stripe</Label>
                <ol className="list-decimal list-inside mt-2 space-y-1 text-sm text-muted-foreground">
                  <li>
                    Go to{" "}
                    <a
                      href="https://dashboard.stripe.com/webhooks"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary underline"
                    >
                      Stripe Webhooks
                      <ExternalLink className="inline h-3 w-3 ml-1" />
                    </a>
                  </li>
                  <li>Click &quot;Add endpoint&quot;</li>
                  <li>Paste the webhook URL above</li>
                  <li>Select events:
                    <ul className="list-disc list-inside ml-4 mt-1">
                      <li>customer.subscription.created</li>
                      <li>customer.subscription.updated</li>
                      <li>customer.subscription.deleted</li>
                      <li>invoice.paid</li>
                      <li>invoice.payment_failed</li>
                    </ul>
                  </li>
                  <li>Click &quot;Add endpoint&quot;</li>
                  <li>Click &quot;Reveal&quot; to get the signing secret</li>
                </ol>
              </div>

              <div className="space-y-2">
                <Label>Step 3: Paste webhook signing secret (starts with whsec_)</Label>
                <Input
                  type="password"
                  value={webhookSecret}
                  onChange={(e) => setWebhookSecret(e.target.value)}
                  placeholder="whsec_xxxxxxxxxxxxx"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setCurrentStep(1)}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button onClick={handleWebhookContinue} className="flex-1">
                <ArrowRight className="mr-2 h-4 w-4" />
                Continue
              </Button>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <Alert className="bg-green-500/10 border-green-500/20">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <AlertDescription className="text-green-400">
                Almost done! Add these environment variables to DigitalOcean.
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <div>
                <Label>Environment Variables for Production</Label>
                <div className="mt-2 bg-zinc-900 p-4 rounded-lg font-mono text-sm space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">STRIPE_SECRET_KEY=</span>
                    <span className="text-green-400">{secretKey ? "sk_****" + secretKey.slice(-4) : "not set"}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=</span>
                    <span className="text-green-400">{publishableKey ? "pk_****" + publishableKey.slice(-4) : "not set"}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">STRIPE_WEBHOOK_SECRET=</span>
                    <span className="text-green-400">{webhookSecret ? "whsec_****" + webhookSecret.slice(-4) : "not set"}</span>
                  </div>
                </div>
              </div>

              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  const envVars = `STRIPE_SECRET_KEY=${secretKey}
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=${publishableKey}
STRIPE_WEBHOOK_SECRET=${webhookSecret}`;
                  copyToClipboard(envVars);
                }}
              >
                <Copy className="mr-2 h-4 w-4" />
                Copy All Environment Variables
              </Button>

              <div className="pt-4 border-t">
                <Label>Where to add them:</Label>
                <ol className="list-decimal list-inside mt-2 space-y-1 text-sm text-muted-foreground">
                  <li>Go to <a href="https://cloud.digitalocean.com/apps" target="_blank" rel="noopener noreferrer" className="text-primary underline">DigitalOcean Apps <ExternalLink className="inline h-3 w-3" /></a></li>
                  <li>Click your app → Settings</li>
                  <li>Scroll to &quot;App-Level Environment Variables&quot;</li>
                  <li>Click Edit → Add each variable</li>
                  <li>Click Save (app will redeploy)</li>
                </ol>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setCurrentStep(2)}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button onClick={handleFinish} className="flex-1">
                <CheckCircle className="mr-2 h-4 w-4" />
                Finish Setup
              </Button>
            </div>
          </div>
        );
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Stripe Setup Wizard</CardTitle>
        <CardDescription>
          Connect Stripe to accept payments and manage subscriptions
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-8">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div
                className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors ${
                  index === currentStep
                    ? "border-primary bg-primary text-primary-foreground"
                    : step.completed
                    ? "border-green-500 bg-green-500 text-white"
                    : "border-muted-foreground/30"
                }`}
              >
                {step.completed ? (
                  <CheckCircle className="h-5 w-5" />
                ) : (
                  step.icon
                )}
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`w-16 h-0.5 mx-2 ${
                    step.completed ? "bg-green-500" : "bg-muted-foreground/30"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step Labels */}
        <div className="flex items-center justify-between mb-8 text-sm">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className={`text-center ${
                index === currentStep ? "text-foreground" : "text-muted-foreground"
              }`}
              style={{ width: "80px" }}
            >
              <p className="font-medium">{step.title}</p>
            </div>
          ))}
        </div>

        {/* Step Content */}
        {renderStepContent()}
      </CardContent>
    </Card>
  );
}
