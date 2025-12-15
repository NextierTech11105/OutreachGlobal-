"use client";

import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StripeOnboardingWizard } from "@/components/stripe/stripe-onboarding-wizard";
import {
  CheckCircle,
  AlertCircle,
  CreditCard,
  Settings,
  LayoutDashboard,
  Wand2,
  RefreshCw,
  ExternalLink,
  DollarSign,
  Users,
  Package,
  TrendingUp,
} from "lucide-react";

interface Product {
  id: string;
  name: string;
  description: string;
  monthlyPrice: { id: string; amount: number } | null;
  yearlyPrice: { id: string; amount: number } | null;
  metadata: any;
}

interface Subscription {
  id: string;
  status: string;
  customer: { email: string; name: string };
  plan: { name: string; amount: number; interval: string };
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
}

export default function StripeAdminPage() {
  const [isConfigured, setIsConfigured] = useState<boolean | null>(null);
  const [hasProducts, setHasProducts] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [stats, setStats] = useState<{
    balance: string;
    products: number;
    activeSubscriptions: number;
    mrr: string;
  } | null>(null);

  const [products, setProducts] = useState<Product[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [subStats, setSubStats] = useState<any>(null);

  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    try {
      const res = await fetch("/api/stripe/test");
      const data = await res.json();

      setIsConfigured(data.configured);

      if (data.configured) {
        setStats({
          balance: data.stats?.balance || "$0.00",
          products: data.stats?.products || 0,
          activeSubscriptions: data.stats?.activeSubscriptions || 0,
          mrr: "$0.00",
        });
        setHasProducts((data.stats?.products || 0) > 0);

        // Fetch products and subscriptions
        await Promise.all([fetchProducts(), fetchSubscriptions()]);
      }
    } catch (error) {
      console.error("Failed to check status:", error);
      setIsConfigured(false);
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await fetch("/api/stripe/products");
      const data = await res.json();
      if (data.success) {
        setProducts(data.products);
        setHasProducts(data.products.length > 0);
      }
    } catch (error) {
      console.error("Failed to fetch products:", error);
    }
  };

  const fetchSubscriptions = async () => {
    try {
      const res = await fetch("/api/stripe/subscriptions");
      const data = await res.json();
      if (data.success) {
        setSubscriptions(data.subscriptions);
        setSubStats(data.stats);
        if (stats) {
          setStats({
            ...stats,
            activeSubscriptions: data.stats.active,
            mrr: data.stats.mrr,
          });
        }
      }
    } catch (error) {
      console.error("Failed to fetch subscriptions:", error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await checkStatus();
    setRefreshing(false);
  };

  const handleWizardComplete = () => {
    checkStatus();
  };

  const formatCurrency = (amount: number) => {
    return `$${(amount / 100).toFixed(2)}`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-500/10 text-green-500">Active</Badge>;
      case "trialing":
        return <Badge className="bg-blue-500/10 text-blue-500">Trialing</Badge>;
      case "past_due":
        return <Badge className="bg-yellow-500/10 text-yellow-500">Past Due</Badge>;
      case "canceled":
        return <Badge className="bg-red-500/10 text-red-500">Canceled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <CreditCard className="h-8 w-8" />
            Stripe Payments
          </h1>
          <p className="text-muted-foreground mt-1">
            Accept payments and manage subscriptions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          {isConfigured ? (
            <Badge className="bg-green-500/10 text-green-500 border-green-500/20">
              <CheckCircle className="mr-1 h-3 w-3" />
              Connected
            </Badge>
          ) : (
            <Badge variant="destructive">
              <AlertCircle className="mr-1 h-3 w-3" />
              Not Configured
            </Badge>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      {isConfigured && stats && (
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-green-500" />
                Balance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.balance}</div>
              <p className="text-xs text-muted-foreground">Available</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-blue-500" />
                MRR
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.mrr}</div>
              <p className="text-xs text-muted-foreground">Monthly recurring</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Users className="h-4 w-4 text-purple-500" />
                Subscribers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeSubscriptions}</div>
              <p className="text-xs text-muted-foreground">Active</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Package className="h-4 w-4 text-orange-500" />
                Products
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.products}</div>
              <p className="text-xs text-muted-foreground">Pricing plans</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Tabs */}
      <Tabs defaultValue={!isConfigured ? "wizard" : hasProducts ? "dashboard" : "wizard"}>
        <TabsList className="mb-6">
          <TabsTrigger value="dashboard" className="gap-2" disabled={!isConfigured}>
            <LayoutDashboard className="h-4 w-4" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="wizard" className="gap-2">
            <Wand2 className="h-4 w-4" />
            Setup Wizard
          </TabsTrigger>
          <TabsTrigger value="products" className="gap-2" disabled={!isConfigured}>
            <Package className="h-4 w-4" />
            Products
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard">
          {isConfigured ? (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Active Subscriptions</CardTitle>
                  <CardDescription>
                    {subStats?.active || 0} active subscribers
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {subscriptions.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Customer</TableHead>
                          <TableHead>Plan</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Renews</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {subscriptions.map((sub) => (
                          <TableRow key={sub.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{sub.customer.name || "—"}</p>
                                <p className="text-sm text-muted-foreground">
                                  {sub.customer.email}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>{sub.plan.name}</TableCell>
                            <TableCell>{getStatusBadge(sub.status)}</TableCell>
                            <TableCell>
                              {formatCurrency(sub.plan.amount)}/{sub.plan.interval}
                            </TableCell>
                            <TableCell>
                              {sub.cancelAtPeriodEnd ? (
                                <span className="text-yellow-500">Canceling</span>
                              ) : (
                                new Date(sub.currentPeriodEnd).toLocaleDateString()
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      No subscriptions yet. Share your pricing page to get customers!
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">
                  Configure Stripe first to view the dashboard.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Setup Wizard Tab */}
        <TabsContent value="wizard">
          <StripeOnboardingWizard onComplete={handleWizardComplete} />
        </TabsContent>

        {/* Products Tab */}
        <TabsContent value="products">
          {isConfigured ? (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Pricing Products</CardTitle>
                  <CardDescription>
                    Manage your subscription plans
                  </CardDescription>
                </div>
                <Button variant="outline" asChild>
                  <a
                    href="https://dashboard.stripe.com/products"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Manage in Stripe
                    <ExternalLink className="ml-2 h-4 w-4" />
                  </a>
                </Button>
              </CardHeader>
              <CardContent>
                {products.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Monthly</TableHead>
                        <TableHead>Yearly</TableHead>
                        <TableHead>Product ID</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {products.map((product) => (
                        <TableRow key={product.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{product.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {product.description}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            {product.monthlyPrice
                              ? formatCurrency(product.monthlyPrice.amount)
                              : "—"}
                          </TableCell>
                          <TableCell>
                            {product.yearlyPrice
                              ? formatCurrency(product.yearlyPrice.amount)
                              : "—"}
                          </TableCell>
                          <TableCell>
                            <code className="text-xs bg-muted px-2 py-1 rounded">
                              {product.id}
                            </code>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground mb-4">
                      No products created yet
                    </p>
                    <Button onClick={() => {}}>
                      <Package className="mr-2 h-4 w-4" />
                      Create Default Plans
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">
                  Configure Stripe first to manage products.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings">
          <div className="grid grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Environment Variables</CardTitle>
                <CardDescription>
                  Required for production deployment
                </CardDescription>
              </CardHeader>
              <CardContent>
                <pre className="bg-zinc-900 p-4 rounded-lg text-sm overflow-x-auto">
                  {`STRIPE_SECRET_KEY=sk_live_xxxxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx`}
                </pre>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Webhook Endpoint</CardTitle>
                <CardDescription>
                  Configure in Stripe Dashboard
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">URL:</p>
                  <code className="text-sm bg-muted px-3 py-2 rounded block">
                    {typeof window !== "undefined"
                      ? `${window.location.origin}/api/billing/webhook`
                      : "/api/billing/webhook"}
                  </code>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Events:</p>
                  <ul className="text-sm space-y-1">
                    <li>• customer.subscription.created</li>
                    <li>• customer.subscription.updated</li>
                    <li>• customer.subscription.deleted</li>
                    <li>• invoice.paid</li>
                    <li>• invoice.payment_failed</li>
                  </ul>
                </div>
                <Button variant="outline" className="w-full" asChild>
                  <a
                    href="https://dashboard.stripe.com/webhooks"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Configure Webhooks
                    <ExternalLink className="ml-2 h-4 w-4" />
                  </a>
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
