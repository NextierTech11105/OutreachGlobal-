"use client";

import { Button } from "@/components/ui/button";
import { FormItem } from "@/components/ui/form/form-item";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/input/password-input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FieldErrors } from "@/components/errors/field-errors";
import { useMutation } from "@apollo/client";
import { $cookie } from "@/lib/cookie/client-cookie";
import { addMonths } from "date-fns";
import { useApiError } from "@/hooks/use-api-error";
import { gql } from "@apollo/client";
import { toast } from "sonner";
import Link from "next/link";

// Register mutation - creates user AND team
const REGISTER_MUTATION = gql`
  mutation Register($input: RegisterInput!) {
    register(input: $input) {
      token
      user {
        id
        email
        name
      }
      team {
        id
        slug
        name
      }
    }
  }
`;

export const RegisterForm: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const plan = searchParams.get("plan") || "starter";
  const billing = searchParams.get("billing") || "monthly";

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    companyName: "",
  });
  const [consent, setConsent] = useState({
    terms: false,
    sms: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [registerMutation] = useMutation(REGISTER_MUTATION);
  const { showError } = useApiError();

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Invalid email address";
    }

    if (!formData.phone.trim()) {
      newErrors.phone = "Phone number is required";
    } else if (!/^\+?[\d\s\-()]{10,}$/.test(formData.phone.replace(/\s/g, ""))) {
      newErrors.phone = "Invalid phone number";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    if (!consent.terms) {
      newErrors.terms = "You must agree to the Terms of Service";
    }

    if (!consent.sms) {
      newErrors.sms = "SMS consent is required to use this platform";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);
    try {
      const { data } = await registerMutation({
        variables: {
          input: {
            name: formData.name,
            email: formData.email,
            phone: formData.phone.startsWith("+1") ? formData.phone : `+1${formData.phone.replace(/\D/g, "")}`,
            password: formData.password,
            companyName: formData.companyName || `${formData.name}'s Team`,
            smsConsent: consent.sms,
            termsAccepted: consent.terms,
          },
        },
      });

      if (!data?.register?.token) {
        throw new Error("Registration failed");
      }

      // Set session cookie
      $cookie.set("session", data.register.token, {
        expires: addMonths(new Date(), 10),
      });

      toast.success("Account created!", {
        description: "Redirecting to checkout...",
      });

      // If a plan was selected, redirect to checkout
      if (plan && plan !== "free") {
        const checkoutResponse = await fetch("/api/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            plan,
            billing,
            email: formData.email,
            teamId: data.register.team.id,
          }),
        });

        const checkoutData = await checkoutResponse.json();
        if (checkoutData.url) {
          window.location.href = checkoutData.url;
          return;
        }
      }

      // Otherwise redirect to dashboard
      const teamSlug = data.register.team.slug;
      router.push(`/t/${teamSlug}`);
    } catch (error) {
      showError(error, { gql: true });
      setLoading(false);
    }
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <FormItem>
        <Label htmlFor="name">Your Name</Label>
        <Input
          id="name"
          type="text"
          placeholder="John Smith"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        />
        {errors.name && (
          <p className="text-sm text-destructive">{errors.name}</p>
        )}
      </FormItem>

      <FormItem>
        <Label htmlFor="email">Work Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="john@company.com"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        />
        {errors.email && (
          <p className="text-sm text-destructive">{errors.email}</p>
        )}
      </FormItem>

      <FormItem>
        <Label htmlFor="phone">Phone Number *</Label>
        <div className="flex">
          <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-input bg-muted text-muted-foreground text-sm">
            +1
          </span>
          <Input
            id="phone"
            type="tel"
            placeholder="(555) 123-4567"
            className="rounded-l-none"
            value={formData.phone}
            onChange={(e) =>
              setFormData({ ...formData, phone: e.target.value })
            }
          />
        </div>
        {errors.phone && (
          <p className="text-sm text-destructive">{errors.phone}</p>
        )}
      </FormItem>

      <FormItem>
        <Label htmlFor="companyName">Company Name (Optional)</Label>
        <Input
          id="companyName"
          type="text"
          placeholder="Acme Inc."
          value={formData.companyName}
          onChange={(e) =>
            setFormData({ ...formData, companyName: e.target.value })
          }
        />
      </FormItem>

      <FormItem>
        <Label htmlFor="password">Password</Label>
        <PasswordInput
          id="password"
          placeholder="••••••••"
          value={formData.password}
          onChange={(e) =>
            setFormData({ ...formData, password: e.target.value })
          }
        />
        {errors.password && (
          <p className="text-sm text-destructive">{errors.password}</p>
        )}
      </FormItem>

      <FormItem>
        <Label htmlFor="confirmPassword">Confirm Password</Label>
        <PasswordInput
          id="confirmPassword"
          placeholder="••••••••"
          value={formData.confirmPassword}
          onChange={(e) =>
            setFormData({ ...formData, confirmPassword: e.target.value })
          }
        />
        {errors.confirmPassword && (
          <p className="text-sm text-destructive">{errors.confirmPassword}</p>
        )}
      </FormItem>

      {/* Consent Checkboxes */}
      <div className="space-y-4 pt-2">
        {/* Terms of Service */}
        <div className="flex items-start space-x-3">
          <Checkbox
            id="terms"
            checked={consent.terms}
            onCheckedChange={(checked) =>
              setConsent({ ...consent, terms: checked === true })
            }
            className="mt-1"
          />
          <label htmlFor="terms" className="text-sm text-muted-foreground leading-tight cursor-pointer">
            I agree to the{" "}
            <Link href="/terms" className="text-foreground underline hover:no-underline">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="text-foreground underline hover:no-underline">
              Privacy Policy
            </Link>
          </label>
        </div>
        {errors.terms && (
          <p className="text-sm text-destructive ml-6">{errors.terms}</p>
        )}

        {/* SMS Consent - TCPA Compliant */}
        <div className="flex items-start space-x-3">
          <Checkbox
            id="sms"
            checked={consent.sms}
            onCheckedChange={(checked) =>
              setConsent({ ...consent, sms: checked === true })
            }
            className="mt-1"
          />
          <label htmlFor="sms" className="text-xs text-muted-foreground leading-relaxed cursor-pointer">
            By providing a telephone number and checking this box, you consent to receive SMS text
            messages from Nextier regarding your account, services, and marketing when applicable.
            Nextier is a consultant, advisor, and owner of Nextier Technologies. Nextier Terminals
            are used for a variety of use cases and provide marketing and custom services when applicable.
            When you consent to receive messaging from Nextier, you are providing consent only to Nextier,
            not any third parties. <strong className="text-foreground">Your SMS opt-in data will never be shared or sold to third parties.</strong>
            {" "}Message frequency varies. Message & data rates may apply. Reply STOP to unsubscribe.
            Reply HELP for help. See our{" "}
            <Link href="/privacy" className="text-foreground underline hover:no-underline">
              Privacy Policy
            </Link>{" "}
            for SMS terms.
          </label>
        </div>
        {errors.sms && (
          <p className="text-sm text-destructive ml-6">{errors.sms}</p>
        )}
      </div>

      <Button
        type="submit"
        className="w-full"
        disabled={loading || !consent.terms || !consent.sms}
      >
        {loading ? "Requesting Access..." : "Request Access"}
      </Button>
    </form>
  );
};
