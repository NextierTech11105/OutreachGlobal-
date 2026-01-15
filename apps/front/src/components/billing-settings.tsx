"use client";

import { useState, useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Check,
  CreditCard,
  Download,
  AlertTriangle,
  Clock,
  XCircle,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ============================================================================
// TYPES
// ============================================================================

interface Subscription {
  id: string;
  status: "active" | "trialing" | "past_due" | "cancelled" | "paused";
  planName: string;
  planSlug: string;
  priceMonthly: number;
  priceYearly: number;
  billingCycle: "monthly" | "yearly";
  currentPeriodEnd: string;
  trialEndsAt?: string;
  cancelledAt?: string;
  cancelAtPeriodEnd: boolean;
}

interface Usage {
  leads: { used: number; limit: number };
  sms: { used: number; limit: number };
  skipTraces: { used: number; limit: number };
  users: { used: number; limit: number };
}

interface Invoice {
  id: string;
  date: string;
  amount: string;
  status: "paid" | "pending" | "failed";
  downloadUrl?: string;
}

interface PaymentMethod {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  isDefault: boolean;
}

// ============================================================================
// PLAN DATA
// ============================================================================

const plans = [
  {
    name: "Starter",
    slug: "starter",
    priceMonthly: 297,
    priceYearly: 2970,
    description: "Perfect for solo agents getting started",
    features: [
      "1,000 Leads/month",
      "500 SMS Messages",
      "50 Skip Traces",
      "1 User",
      "AI Research Assistant",
      "Email Support",
    ],
  },
  {
    name: "Pro",
    slug: "pro",
    priceMonthly: 597,
    priceYearly: 5970,
    description: "For growing teams ready to scale",
    features: [
      "5,000 Leads/month",
      "2,500 SMS Messages",
      "250 Skip Traces",
      "3 Users",
      "Power Dialer",
      "Priority Support",
    ],
    popular: true,
  },
  {
    name: "Agency",
    slug: "agency",
    priceMonthly: 1497,
    priceYearly: 14970,
    description: "For established teams and brokerages",
    features: [
      "25,000 Leads/month",
      "10,000 SMS Messages",
      "1,000 Skip Traces",
      "10 Users",
      "API Access",
      "Dedicated Support",
    ],
  },
];

const cancellationReasons = [
  { value: "too_expensive", label: "Too expensive" },
  { value: "not_using", label: "Not using it enough" },
  { value: "missing_features", label: "Missing features I need" },
  { value: "switching_competitor", label: "Switching to competitor" },
  { value: "business_closed", label: "Business closed" },
  { value: "other", label: "Other" },
];

// ============================================================================
// FORM SCHEMAS
// ============================================================================

const paymentFormSchema = z.object({
  cardNumber: z.string().min(1, "Card number is required"),
  expiry: z.string().min(1, "Expiry date is required"),
  cvc: z.string().min(1, "CVC is required"),
  name: z.string().min(1, "Name is required"),
});

type PaymentFormValues = z.infer<typeof paymentFormSchema>;

// ============================================================================
// COMPONENT
// ============================================================================

export function BillingSettings() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [cancellationReason, setCancellationReason] = useState("");
  const [cancellationFeedback, setCancellationFeedback] = useState("");

  // Subscription state - loaded from API
  const [subscription, setSubscription] = useState<Subscription>({
    id: "",
    status: "active",
    planName: "Loading...",
    planSlug: "",
    priceMonthly: 0,
    priceYearly: 0,
    billingCycle: "monthly",
    currentPeriodEnd: new Date().toISOString(),
    cancelAtPeriodEnd: false,
  });

  const [usage, setUsage] = useState<Usage>({
    leads: { used: 0, limit: 1000 },
    sms: { used: 0, limit: 500 },
    skipTraces: { used: 0, limit: 50 },
    users: { used: 1, limit: 1 },
  });

  const [invoices, setInvoices] = useState<Invoice[]>([]);

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);

  // ============================================================================
  // FETCH BILLING DATA FROM API
  // ============================================================================

  useEffect(() => {
    async function fetchBillingData() {
      setIsDataLoading(true);
      try {
        const response = await fetch("/api/billing/my-subscription");

        if (!response.ok) {
          if (response.status === 401) {
            // Not authenticated - show default state
            setIsDataLoading(false);
            return;
          }
          throw new Error("Failed to load billing data");
        }

        const data = await response.json();

        // Update subscription
        setSubscription({
          id: data.subscription.id,
          status: data.subscription.status as Subscription["status"],
          planName: data.subscription.planName,
          planSlug: data.subscription.planSlug,
          priceMonthly: data.subscription.priceMonthly,
          priceYearly: data.subscription.priceYearly,
          billingCycle: data.subscription.billingCycle as "monthly" | "yearly",
          currentPeriodEnd: data.subscription.currentPeriodEnd,
          trialEndsAt: data.subscription.trialEndsAt || undefined,
          cancelledAt: data.subscription.cancelledAt || undefined,
          cancelAtPeriodEnd: data.subscription.cancelAtPeriodEnd,
        });

        // Update usage
        setUsage(data.usage);

        // Update invoices
        setInvoices(
          data.invoices.map((inv: any) => ({
            id: inv.id,
            date: inv.date,
            amount: inv.amount,
            status: inv.status as Invoice["status"],
            downloadUrl: inv.downloadUrl,
          }))
        );

        // Update payment method
        if (data.paymentMethod) {
          setPaymentMethod(data.paymentMethod);
        }
      } catch (error) {
        console.error("Failed to fetch billing data:", error);
        toast({
          title: "Error loading billing data",
          description: "Please refresh the page to try again.",
          variant: "destructive",
        });
      } finally {
        setIsDataLoading(false);
      }
    }

    fetchBillingData();
  }, [toast]);

  const paymentForm = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: {
      cardNumber: "",
      expiry: "",
      cvc: "",
      name: "",
    },
  });

  // ============================================================================
  // TRIAL COUNTDOWN
  // ============================================================================

  const [trialDaysLeft, setTrialDaysLeft] = useState<number | null>(null);

  useEffect(() => {
    if (subscription.status === "trialing" && subscription.trialEndsAt) {
      const updateTrialDays = () => {
        const now = new Date();
        const trialEnd = new Date(subscription.trialEndsAt!);
        const diffMs = trialEnd.getTime() - now.getTime();
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        setTrialDaysLeft(Math.max(0, diffDays));
      };

      updateTrialDays();
      const interval = setInterval(updateTrialDays, 60000); // Update every minute

      return () => clearInterval(interval);
    }
  }, [subscription.status, subscription.trialEndsAt]);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  async function handleDownloadInvoice(invoiceId: string) {
    try {
      // In production: fetch invoice PDF from Stripe
      toast({
        title: "Invoice downloaded",
        description: `Invoice ${invoiceId} has been downloaded.`,
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to download invoice.",
        variant: "destructive",
      });
    }
  }

  async function handleChangePlan(planSlug: string) {
    setIsLoading(true);

    try {
      // In production: call /api/billing/change-plan
      const response = await fetch("/api/billing/change-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planSlug }),
      });

      if (!response.ok) throw new Error("Failed to change plan");

      const plan = plans.find((p) => p.slug === planSlug);
      setSubscription((prev) => ({
        ...prev,
        planName: plan?.name || planSlug,
        planSlug,
        priceMonthly: plan?.priceMonthly || prev.priceMonthly,
      }));

      toast({
        title: "Plan changed",
        description: `Your subscription has been changed to the ${plan?.name} plan.`,
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to change plan. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCancelSubscription() {
    if (!cancellationReason) {
      toast({
        title: "Please select a reason",
        description: "Help us understand why you're cancelling.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      // In production: call /api/billing/cancel
      const response = await fetch("/api/billing/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: cancellationReason,
          feedback: cancellationFeedback,
        }),
      });

      if (!response.ok) throw new Error("Failed to cancel subscription");

      setSubscription((prev) => ({
        ...prev,
        cancelAtPeriodEnd: true,
        cancelledAt: new Date().toISOString(),
      }));

      setIsCancelDialogOpen(false);
      setCancellationReason("");
      setCancellationFeedback("");

      toast({
        title: "Subscription cancelled",
        description: `You'll have access until ${new Date(subscription.currentPeriodEnd).toLocaleDateString()}.`,
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to cancel subscription. Please contact support.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function handleReactivateSubscription() {
    setIsLoading(true);

    try {
      // In production: call /api/billing/reactivate
      const response = await fetch("/api/billing/reactivate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) throw new Error("Failed to reactivate");

      setSubscription((prev) => ({
        ...prev,
        cancelAtPeriodEnd: false,
        cancelledAt: undefined,
        status: "active",
      }));

      toast({
        title: "Subscription reactivated",
        description: "Your subscription has been reactivated successfully!",
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to reactivate. Please contact support.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function onPaymentSubmit(data: PaymentFormValues) {
    setIsLoading(true);

    try {
      // In production: call /api/billing/update-payment-method with Stripe
      const response = await fetch("/api/billing/update-payment-method", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error("Failed to update payment method");

      toast({
        title: "Payment method updated",
        description: "Your payment method has been updated successfully.",
      });
      setIsPaymentDialogOpen(false);
      paymentForm.reset();
    } catch {
      toast({
        title: "Error",
        description: "Failed to update payment method.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  // ============================================================================
  // STATUS BADGE
  // ============================================================================

  function getStatusBadge() {
    if (subscription.cancelAtPeriodEnd) {
      return (
        <Badge variant="destructive" className="gap-1">
          <XCircle className="h-3 w-3" />
          Cancelling
        </Badge>
      );
    }

    switch (subscription.status) {
      case "trialing":
        return (
          <Badge variant="secondary" className="gap-1">
            <Clock className="h-3 w-3" />
            Trial
          </Badge>
        );
      case "active":
        return (
          <Badge variant="default" className="gap-1 bg-green-600">
            <Check className="h-3 w-3" />
            Active
          </Badge>
        );
      case "past_due":
        return (
          <Badge variant="destructive" className="gap-1">
            <AlertTriangle className="h-3 w-3" />
            Past Due
          </Badge>
        );
      case "cancelled":
        return (
          <Badge variant="outline" className="gap-1">
            <XCircle className="h-3 w-3" />
            Cancelled
          </Badge>
        );
      default:
        return <Badge variant="outline">{subscription.status}</Badge>;
    }
  }

  // ============================================================================
  // RENDER
  // ============================================================================

  // Loading state
  if (isDataLoading) {
    return (
      <div className="space-y-10">
        <Card>
          <CardContent className="py-8">
            <div className="flex items-center justify-center gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="text-muted-foreground">Loading billing information...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      {/* Trial Banner */}
      {subscription.status === "trialing" && trialDaysLeft !== null && (
        <Card
          className={
            trialDaysLeft <= 3
              ? "border-orange-500 bg-orange-50 dark:bg-orange-950/20"
              : "border-blue-500 bg-blue-50 dark:bg-blue-950/20"
          }
        >
          <CardContent className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <Clock
                className={
                  trialDaysLeft <= 3
                    ? "h-5 w-5 text-orange-500"
                    : "h-5 w-5 text-blue-500"
                }
              />
              <div>
                <p className="font-medium">
                  {trialDaysLeft === 0
                    ? "Your trial ends today!"
                    : trialDaysLeft === 1
                      ? "Your trial ends tomorrow!"
                      : `${trialDaysLeft} days left in your trial`}
                </p>
                <p className="text-sm text-muted-foreground">
                  {trialDaysLeft <= 3
                    ? "Upgrade now to avoid losing access"
                    : "Explore all features before your trial ends"}
                </p>
              </div>
            </div>
            <Button variant={trialDaysLeft <= 3 ? "default" : "outline"}>
              Upgrade Now
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Cancellation Notice */}
      {subscription.cancelAtPeriodEnd && (
        <Card className="border-red-500 bg-red-50 dark:bg-red-950/20">
          <CardContent className="flex items-center justify-between py-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <div>
                <p className="font-medium text-red-700 dark:text-red-400">
                  Your subscription will end on{" "}
                  {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                </p>
                <p className="text-sm text-muted-foreground">
                  You&apos;ll lose access to all premium features after this
                  date
                </p>
              </div>
            </div>
            <Button onClick={handleReactivateSubscription} disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Reactivate
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Current Plan */}
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium">Current Plan</h3>
          <p className="text-sm text-muted-foreground">
            Manage your subscription plan and usage.
          </p>
        </div>

        <div className="rounded-lg border p-6">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <h4 className="text-lg font-medium">
                {subscription.planName} Plan
              </h4>
              <p className="text-sm text-muted-foreground">
                ${subscription.priceMonthly}/month, billed{" "}
                {subscription.billingCycle}
              </p>
            </div>
            {getStatusBadge()}
          </div>

          <Separator className="my-6" />

          {/* Usage Stats */}
          <div className="space-y-6">
            <div>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span>Leads</span>
                <span>
                  {usage.leads.used.toLocaleString()} /{" "}
                  {usage.leads.limit.toLocaleString()}
                </span>
              </div>
              <Progress value={(usage.leads.used / usage.leads.limit) * 100} />
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span>SMS Messages</span>
                <span>
                  {usage.sms.used.toLocaleString()} /{" "}
                  {usage.sms.limit.toLocaleString()}
                </span>
              </div>
              <Progress value={(usage.sms.used / usage.sms.limit) * 100} />
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span>Skip Traces</span>
                <span>
                  {usage.skipTraces.used} / {usage.skipTraces.limit}
                </span>
              </div>
              <Progress
                value={(usage.skipTraces.used / usage.skipTraces.limit) * 100}
              />
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span>Team Members</span>
                <span>
                  {usage.users.used} / {usage.users.limit}
                </span>
              </div>
              <Progress value={(usage.users.used / usage.users.limit) * 100} />
            </div>
          </div>

          <Separator className="my-6" />

          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm">
                {subscription.cancelAtPeriodEnd
                  ? "Access ends on "
                  : "Next billing date: "}
                <strong>
                  {new Date(subscription.currentPeriodEnd).toLocaleDateString(
                    "en-US",
                    {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    },
                  )}
                </strong>
              </p>
            </div>
            <div className="flex flex-1 justify-end gap-4">
              {!subscription.cancelAtPeriodEnd && (
                <Dialog
                  open={isCancelDialogOpen}
                  onOpenChange={setIsCancelDialogOpen}
                >
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      className="text-red-600 hover:text-red-700"
                    >
                      Cancel Subscription
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Cancel Subscription</DialogTitle>
                      <DialogDescription>
                        We&apos;re sorry to see you go. Your subscription will
                        remain active until{" "}
                        {new Date(
                          subscription.currentPeriodEnd,
                        ).toLocaleDateString()}
                        .
                      </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="reason">
                          Why are you cancelling? *
                        </Label>
                        <Select
                          value={cancellationReason}
                          onValueChange={setCancellationReason}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select a reason" />
                          </SelectTrigger>
                          <SelectContent>
                            {cancellationReasons.map((reason) => (
                              <SelectItem
                                key={reason.value}
                                value={reason.value}
                              >
                                {reason.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="feedback">
                          Additional feedback (optional)
                        </Label>
                        <Textarea
                          id="feedback"
                          placeholder="Tell us what we could have done better..."
                          value={cancellationFeedback}
                          onChange={(e) =>
                            setCancellationFeedback(e.target.value)
                          }
                          rows={3}
                        />
                      </div>

                      <div className="rounded-lg bg-muted p-4">
                        <p className="text-sm font-medium">Before you go:</p>
                        <ul className="mt-2 text-sm text-muted-foreground space-y-1">
                          <li>- You won&apos;t be charged again</li>
                          <li>- Your data will be saved for 90 days</li>
                          <li>- You can reactivate anytime</li>
                        </ul>
                      </div>
                    </div>

                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setIsCancelDialogOpen(false)}
                      >
                        Keep Subscription
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={handleCancelSubscription}
                        disabled={isLoading || !cancellationReason}
                      >
                        {isLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : null}
                        Confirm Cancellation
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}

              <Dialog>
                <DialogTrigger asChild>
                  <Button>Change Plan</Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl">
                  <DialogHeader>
                    <DialogTitle>Change Subscription Plan</DialogTitle>
                    <DialogDescription>
                      Choose the plan that best fits your needs.
                    </DialogDescription>
                  </DialogHeader>
                  <Tabs defaultValue="monthly">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="monthly">Monthly</TabsTrigger>
                      <TabsTrigger value="annual">
                        Annual (Save 17%)
                      </TabsTrigger>
                    </TabsList>
                    <TabsContent value="monthly" className="mt-4">
                      <div className="grid gap-4 md:grid-cols-3">
                        {plans.map((plan) => {
                          const isCurrent = plan.slug === subscription.planSlug;
                          return (
                            <Card
                              key={plan.slug}
                              className={`relative ${isCurrent ? "border-primary" : ""} ${plan.popular ? "border-2 border-primary" : ""}`}
                            >
                              {plan.popular && (
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                                  <Badge className="bg-primary">
                                    Most Popular
                                  </Badge>
                                </div>
                              )}
                              <CardHeader>
                                <CardTitle>{plan.name}</CardTitle>
                                <CardDescription>
                                  {plan.description}
                                </CardDescription>
                              </CardHeader>
                              <CardContent>
                                <div className="mb-4">
                                  <span className="text-3xl font-bold">
                                    ${plan.priceMonthly}
                                  </span>
                                  <span className="text-muted-foreground">
                                    /month
                                  </span>
                                </div>
                                <ul className="space-y-2 text-sm">
                                  {plan.features.map((feature) => (
                                    <li
                                      key={feature}
                                      className="flex items-center gap-2"
                                    >
                                      <Check className="h-4 w-4 text-primary" />
                                      <span>{feature}</span>
                                    </li>
                                  ))}
                                </ul>
                              </CardContent>
                              <CardFooter>
                                <Button
                                  className="w-full"
                                  variant={isCurrent ? "outline" : "default"}
                                  disabled={isCurrent || isLoading}
                                  onClick={() => handleChangePlan(plan.slug)}
                                >
                                  {isLoading ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : isCurrent ? (
                                    "Current Plan"
                                  ) : (
                                    "Select Plan"
                                  )}
                                </Button>
                              </CardFooter>
                            </Card>
                          );
                        })}
                      </div>
                    </TabsContent>
                    <TabsContent value="annual" className="mt-4">
                      <div className="grid gap-4 md:grid-cols-3">
                        {plans.map((plan) => {
                          const isCurrent = plan.slug === subscription.planSlug;
                          const annualMonthly = Math.round(
                            plan.priceYearly / 12,
                          );
                          return (
                            <Card
                              key={plan.slug}
                              className={`relative ${isCurrent ? "border-primary" : ""}`}
                            >
                              <CardHeader>
                                <CardTitle>{plan.name}</CardTitle>
                                <CardDescription>
                                  {plan.description}
                                </CardDescription>
                              </CardHeader>
                              <CardContent>
                                <div className="mb-4">
                                  <span className="text-3xl font-bold">
                                    ${annualMonthly}
                                  </span>
                                  <span className="text-muted-foreground">
                                    /mo
                                  </span>
                                  <p className="text-sm text-muted-foreground">
                                    ${plan.priceYearly.toLocaleString()} billed
                                    annually
                                  </p>
                                </div>
                                <ul className="space-y-2 text-sm">
                                  {plan.features.map((feature) => (
                                    <li
                                      key={feature}
                                      className="flex items-center gap-2"
                                    >
                                      <Check className="h-4 w-4 text-primary" />
                                      <span>{feature}</span>
                                    </li>
                                  ))}
                                </ul>
                              </CardContent>
                              <CardFooter>
                                <Button
                                  className="w-full"
                                  variant={isCurrent ? "outline" : "default"}
                                  disabled={isCurrent || isLoading}
                                  onClick={() => handleChangePlan(plan.slug)}
                                >
                                  {isCurrent ? "Current Plan" : "Select Plan"}
                                </Button>
                              </CardFooter>
                            </Card>
                          );
                        })}
                      </div>
                    </TabsContent>
                  </Tabs>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </div>

      <Separator />

      {/* Payment Method */}
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium">Payment Method</h3>
          <p className="text-sm text-muted-foreground">
            Manage your payment method and billing information.
          </p>
        </div>

        <div className="rounded-lg border p-6">
          {paymentMethod ? (
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-16 items-center justify-center rounded-md border bg-muted">
                  <CreditCard className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium capitalize">
                    {paymentMethod.brand} ending in {paymentMethod.last4}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Expires {paymentMethod.expMonth.toString().padStart(2, "0")}
                    /{paymentMethod.expYear}
                  </p>
                </div>
              </div>
              <Dialog
                open={isPaymentDialogOpen}
                onOpenChange={setIsPaymentDialogOpen}
              >
                <DialogTrigger asChild>
                  <Button variant="outline">Update Payment Method</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Update Payment Method</DialogTitle>
                    <DialogDescription>
                      Enter your new payment details.
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...paymentForm}>
                    <form
                      onSubmit={paymentForm.handleSubmit(onPaymentSubmit)}
                      className="space-y-4 py-4"
                    >
                      <FormField
                        control={paymentForm.control}
                        name="cardNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Card Number</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="4242 4242 4242 4242"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={paymentForm.control}
                          name="expiry"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Expiry Date</FormLabel>
                              <FormControl>
                                <Input placeholder="MM/YY" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={paymentForm.control}
                          name="cvc"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>CVC</FormLabel>
                              <FormControl>
                                <Input placeholder="123" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={paymentForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Name on Card</FormLabel>
                            <FormControl>
                              <Input placeholder="John Doe" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <DialogFooter className="mt-4">
                        <Button
                          variant="outline"
                          onClick={() => setIsPaymentDialogOpen(false)}
                          type="button"
                        >
                          Cancel
                        </Button>
                        <Button type="submit" disabled={isLoading}>
                          {isLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : null}
                          Update Payment Method
                        </Button>
                      </DialogFooter>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>
          ) : (
            <div className="text-center py-6">
              <CreditCard className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">
                No payment method on file
              </p>
              <Button onClick={() => setIsPaymentDialogOpen(true)}>
                Add Payment Method
              </Button>
            </div>
          )}
        </div>
      </div>

      <Separator />

      {/* Billing History */}
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium">Billing History</h3>
          <p className="text-sm text-muted-foreground">
            View and download your past invoices.
          </p>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center text-muted-foreground py-8"
                  >
                    No invoices yet
                  </TableCell>
                </TableRow>
              ) : (
                invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">{invoice.id}</TableCell>
                    <TableCell>
                      {new Date(invoice.date).toLocaleDateString()}
                    </TableCell>
                    <TableCell>{invoice.amount}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          invoice.status === "paid"
                            ? "default"
                            : invoice.status === "pending"
                              ? "secondary"
                              : "destructive"
                        }
                      >
                        {invoice.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDownloadInvoice(invoice.id)}
                      >
                        <Download className="h-4 w-4" />
                        <span className="sr-only">Download</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
