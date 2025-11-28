"use client";

import { useState } from "react";
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
import { Check, CreditCard, Download } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const invoices = [
  {
    id: "INV-001",
    date: "2025-04-01",
    amount: "$99.00",
    status: "paid",
  },
  {
    id: "INV-002",
    date: "2025-03-01",
    amount: "$99.00",
    status: "paid",
  },
  {
    id: "INV-003",
    date: "2025-02-01",
    amount: "$99.00",
    status: "paid",
  },
  {
    id: "INV-004",
    date: "2025-01-01",
    amount: "$99.00",
    status: "paid",
  },
  {
    id: "INV-005",
    date: "2024-12-01",
    amount: "$99.00",
    status: "paid",
  },
];

const plans = [
  {
    name: "Starter",
    price: "$49",
    description:
      "Perfect for individuals and small teams just getting started with cold outreach.",
    features: [
      "Up to 1,000 emails per month",
      "Basic email templates",
      "Lead generation (100 leads/mo)",
      "Basic reporting",
      "Email support",
    ],
    current: false,
  },
  {
    name: "Professional",
    price: "$99",
    description:
      "For growing teams that need more advanced features and higher limits.",
    features: [
      "Up to 5,000 emails per month",
      "Advanced email templates",
      "Lead generation (500 leads/mo)",
      "Advanced reporting",
      "Priority email support",
      "Team collaboration (up to 5 users)",
    ],
    current: true,
  },
  {
    name: "Enterprise",
    price: "$249",
    description:
      "For large teams and organizations that need the highest limits and premium features.",
    features: [
      "Up to 20,000 emails per month",
      "Custom email templates",
      "Lead generation (2,000 leads/mo)",
      "Custom reporting",
      "24/7 priority support",
      "Team collaboration (unlimited users)",
      "Custom integrations",
      "Dedicated account manager",
    ],
    current: false,
  },
];

// Define form schema for payment method
const paymentFormSchema = z.object({
  cardNumber: z.string().min(1, "Card number is required"),
  expiry: z.string().min(1, "Expiry date is required"),
  cvc: z.string().min(1, "CVC is required"),
  name: z.string().min(1, "Name is required"),
});

type PaymentFormValues = z.infer<typeof paymentFormSchema>;

export function BillingSettings() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);

  const paymentForm = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: {
      cardNumber: "",
      expiry: "",
      cvc: "",
      name: "",
    },
  });

  function handleDownloadInvoice(id: string) {
    toast({
      title: "Invoice downloaded",
      description: `Invoice ${id} has been downloaded.`,
    });
  }

  function handleChangePlan(plan: string) {
    setIsLoading(true);

    // Simulate API call
    setTimeout(() => {
      toast({
        title: "Plan changed",
        description: `Your subscription has been changed to the ${plan} plan.`,
      });
      setIsLoading(false);
    }, 1000);
  }

  function onPaymentSubmit(data: PaymentFormValues) {
    setIsLoading(true);

    // Simulate API call
    setTimeout(() => {
      console.log(data);
      toast({
        title: "Payment method updated",
        description: "Your payment method has been updated successfully.",
      });
      setIsLoading(false);
      setIsPaymentDialogOpen(false);
      paymentForm.reset();
    }, 1000);
  }

  return (
    <div className="space-y-10">
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
              <h4 className="text-lg font-medium">Professional Plan</h4>
              <p className="text-sm text-muted-foreground">
                $99/month, billed monthly
              </p>
            </div>
            <Badge variant="outline" className="w-fit">
              Active
            </Badge>
          </div>

          <Separator className="my-6" />

          <div className="space-y-6">
            <div>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span>Email Usage</span>
                <span>3,245 / 5,000</span>
              </div>
              <Progress value={65} />
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span>Lead Generation</span>
                <span>320 / 500</span>
              </div>
              <Progress value={64} />
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span>Team Members</span>
                <span>3 / 5</span>
              </div>
              <Progress value={60} />
            </div>
          </div>

          <Separator className="my-6" />

          <div className="flex flex-col gap-4 md:flex-row">
            <div>
              <p className="text-sm">
                Your next billing date is <strong>May 1, 2025</strong>
              </p>
            </div>
            <div className="flex flex-1 justify-end gap-4">
              <Button variant="outline">Cancel Subscription</Button>
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
                        Annual (Save 20%)
                      </TabsTrigger>
                    </TabsList>
                    <TabsContent value="monthly" className="mt-4">
                      <div className="grid gap-4 md:grid-cols-3">
                        {plans.map((plan) => (
                          <Card
                            key={plan.name}
                            className={plan.current ? "border-primary" : ""}
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
                                  {plan.price}
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
                                variant={
                                  plan.current ? "outline-solid" : "default"
                                }
                                disabled={plan.current || isLoading}
                                onClick={() => handleChangePlan(plan.name)}
                              >
                                {plan.current ? "Current Plan" : "Select Plan"}
                              </Button>
                            </CardFooter>
                          </Card>
                        ))}
                      </div>
                    </TabsContent>
                    <TabsContent value="annual" className="mt-4">
                      <div className="grid gap-4 md:grid-cols-3">
                        {plans.map((plan) => (
                          <Card
                            key={plan.name}
                            className={plan.current ? "border-primary" : ""}
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
                                  $
                                  {Number.parseInt(plan.price.substring(1)) *
                                    0.8 *
                                    12}
                                </span>
                                <span className="text-muted-foreground">
                                  /year
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
                                variant={
                                  plan.current ? "outline-solid" : "default"
                                }
                                disabled={plan.current || isLoading}
                                onClick={() => handleChangePlan(plan.name)}
                              >
                                {plan.current ? "Current Plan" : "Select Plan"}
                              </Button>
                            </CardFooter>
                          </Card>
                        ))}
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

      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium">Payment Method</h3>
          <p className="text-sm text-muted-foreground">
            Manage your payment method and billing information.
          </p>
        </div>

        <div className="rounded-lg border p-6">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-16 items-center justify-center rounded-md border bg-muted">
                <CreditCard className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium">Visa ending in 4242</p>
                <p className="text-sm text-muted-foreground">Expires 04/2026</p>
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
                        {isLoading ? "Updating..." : "Update Payment Method"}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      <Separator />

      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-medium">Billing Information</h3>
          <p className="text-sm text-muted-foreground">
            Manage your billing address and tax information.
          </p>
        </div>

        <div className="rounded-lg border p-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <h4 className="mb-2 text-sm font-medium">Billing Address</h4>
              <address className="not-italic text-sm text-muted-foreground">
                John Doe
                <br />
                Acme Inc
                <br />
                123 Main St
                <br />
                San Francisco, CA 94105
                <br />
                United States
              </address>
            </div>
            <div>
              <h4 className="mb-2 text-sm font-medium">Tax Information</h4>
              <p className="text-sm text-muted-foreground">
                Tax ID: US123456789
              </p>
            </div>
          </div>
          <div className="mt-6 flex justify-end">
            <Button variant="outline">Update Billing Information</Button>
          </div>
        </div>
      </div>

      <Separator />

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
              {invoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="font-medium">{invoice.id}</TableCell>
                  <TableCell>{invoice.date}</TableCell>
                  <TableCell>{invoice.amount}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        invoice.status === "paid" ? "default" : "destructive"
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
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="flex justify-end">
          <Button variant="outline">View All Invoices</Button>
        </div>
      </div>
    </div>
  );
}
