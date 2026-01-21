"use client";

import { useState } from "react";
import { APP_NAME, COMPANY_NAME } from "@/config/branding";
import { CALENDLY_CONFIG } from "@/config/constants";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Link from "next/link";
import {
  ArrowLeft,
  Mail,
  MessageSquare,
  Phone,
  Calendar,
  Building2,
  HelpCircle,
  FileText,
  Shield,
  CheckCircle,
  Loader2,
} from "lucide-react";

const contactReasons = [
  { value: "sales", label: "Sales Inquiry", icon: Building2 },
  { value: "support", label: "Technical Support", icon: HelpCircle },
  { value: "billing", label: "Billing Question", icon: FileText },
  {
    value: "partnership",
    label: "Partnership Opportunity",
    icon: MessageSquare,
  },
  { value: "privacy", label: "Privacy / Data Request", icon: Shield },
  { value: "other", label: "Other", icon: Mail },
];

export default function ContactPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    company: "",
    phone: "",
    reason: "",
    message: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to send message");
      }

      setIsSubmitted(true);
    } catch (error) {
      // Show error toast or alert
      alert(
        error instanceof Error
          ? error.message
          : "Failed to send message. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex items-center justify-center">
        <Card className="max-w-md mx-4">
          <CardContent className="pt-8 text-center">
            <div className="mx-auto mb-4 p-4 rounded-full bg-green-100 dark:bg-green-900/30 w-fit">
              <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Message Sent!</h2>
            <p className="text-muted-foreground mb-6">
              Thank you for reaching out. Our team will get back to you within
              24 hours.
            </p>
            <div className="flex gap-3 justify-center">
              <Link href="/get-started">
                <Button variant="outline">Back to Home</Button>
              </Link>
              <Link href="/pricing">
                <Button>View Pricing</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <Link href="/get-started">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>

        <div className="text-center mb-12">
          <Badge className="mb-4" variant="secondary">
            Contact
          </Badge>
          <h1 className="text-4xl font-bold tracking-tight mb-4">
            Get in Touch
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Have questions about {APP_NAME}? Our team is here to help. Reach out
            and we&apos;ll respond within 24 hours.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Contact Form */}
          <div className="md:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Send us a Message</CardTitle>
                <CardDescription>
                  Fill out the form below and we&apos;ll get back to you as soon
                  as possible.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name *</Label>
                      <Input
                        id="name"
                        placeholder="John Smith"
                        required
                        value={formData.name}
                        onChange={(e) =>
                          setFormData({ ...formData, name: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address *</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="john@company.com"
                        required
                        value={formData.email}
                        onChange={(e) =>
                          setFormData({ ...formData, email: e.target.value })
                        }
                      />
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="company">Company</Label>
                      <Input
                        id="company"
                        placeholder="Acme Corp"
                        value={formData.company}
                        onChange={(e) =>
                          setFormData({ ...formData, company: e.target.value })
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="+1 (555) 000-0000"
                        value={formData.phone}
                        onChange={(e) =>
                          setFormData({ ...formData, phone: e.target.value })
                        }
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reason">What can we help you with? *</Label>
                    <Select
                      required
                      value={formData.reason}
                      onValueChange={(value) =>
                        setFormData({ ...formData, reason: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a reason" />
                      </SelectTrigger>
                      <SelectContent>
                        {contactReasons.map((reason) => (
                          <SelectItem key={reason.value} value={reason.value}>
                            <div className="flex items-center gap-2">
                              <reason.icon className="h-4 w-4" />
                              {reason.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="message">Message *</Label>
                    <Textarea
                      id="message"
                      placeholder="Tell us more about how we can help..."
                      rows={5}
                      required
                      value={formData.message}
                      onChange={(e) =>
                        setFormData({ ...formData, message: e.target.value })
                      }
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Mail className="h-4 w-4 mr-2" />
                        Send Message
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Contact Info Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Contact</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <a
                  href="mailto:hello@nextier.io"
                  className="flex items-center gap-3 text-sm hover:text-primary transition-colors"
                >
                  <div className="p-2 rounded-lg bg-muted">
                    <Mail className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-medium">Email Us</p>
                    <p className="text-muted-foreground">hello@nextier.io</p>
                  </div>
                </a>

                <a
                  href="tel:+15164079249"
                  className="flex items-center gap-3 text-sm hover:text-primary transition-colors"
                >
                  <div className="p-2 rounded-lg bg-muted">
                    <Phone className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-medium">Call Us</p>
                    <p className="text-muted-foreground">+1 (516) 407-9249</p>
                  </div>
                </a>

                <a
                  href={CALENDLY_CONFIG.bookingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 text-sm hover:text-primary transition-colors"
                >
                  <div className="p-2 rounded-lg bg-primary">
                    <Calendar className="h-4 w-4 text-primary-foreground" />
                  </div>
                  <div>
                    <p className="font-medium">Book with Founder</p>
                    <p className="text-muted-foreground">
                      15-min Discovery Call
                    </p>
                  </div>
                </a>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Department Emails</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <p className="font-medium">Sales</p>
                  <a
                    href="mailto:sales@nextier.io"
                    className="text-primary hover:underline"
                  >
                    sales@nextier.io
                  </a>
                </div>
                <div>
                  <p className="font-medium">Support</p>
                  <a
                    href="mailto:support@nextier.io"
                    className="text-primary hover:underline"
                  >
                    support@nextier.io
                  </a>
                </div>
                <div>
                  <p className="font-medium">Billing</p>
                  <a
                    href="mailto:billing@nextier.io"
                    className="text-primary hover:underline"
                  >
                    billing@nextier.io
                  </a>
                </div>
                <div>
                  <p className="font-medium">Privacy</p>
                  <a
                    href="mailto:privacy@nextier.io"
                    className="text-primary hover:underline"
                  >
                    privacy@nextier.io
                  </a>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-primary text-primary-foreground">
              <CardContent className="pt-6">
                <h3 className="font-semibold mb-2">Need Immediate Help?</h3>
                <p className="text-sm text-primary-foreground/80 mb-4">
                  Pro and Agency customers get priority support with faster
                  response times.
                </p>
                <Link href="/pricing">
                  <Button variant="secondary" size="sm" className="w-full">
                    View Plans
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Legal Links Footer */}
        <div className="mt-12 text-center text-sm text-muted-foreground">
          <p>
            By contacting us, you agree to our{" "}
            <Link href="/terms" className="text-primary hover:underline">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="text-primary hover:underline">
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
