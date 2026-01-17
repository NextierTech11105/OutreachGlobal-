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

// Google icon SVG
const GoogleIcon = () => (
  <svg className="h-5 w-5" viewBox="0 0 24 24">
    <path
      fill="#4285F4"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="#34A853"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="#FBBC05"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
    />
    <path
      fill="#EA4335"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
    />
  </svg>
);

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
    } else if (
      !/^\+?[\d\s\-()]{10,}$/.test(formData.phone.replace(/\s/g, ""))
    ) {
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
            phone: formData.phone.startsWith("+1")
              ? formData.phone
              : `+1${formData.phone.replace(/\D/g, "")}`,
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

  const handleGoogleSignup = () => {
    window.location.href = "/api/auth/google";
  };

  return (
    <div className="space-y-6">
      {/* Google OAuth */}
      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={handleGoogleSignup}
      >
        <GoogleIcon />
        <span className="ml-2">Continue with Google</span>
      </Button>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            Or continue with email
          </span>
        </div>
      </div>

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
          <label
            htmlFor="terms"
            className="text-sm text-muted-foreground leading-tight cursor-pointer"
          >
            I agree to the{" "}
            <Link
              href="/terms"
              className="text-foreground underline hover:no-underline"
            >
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link
              href="/privacy"
              className="text-foreground underline hover:no-underline"
            >
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
          <label
            htmlFor="sms"
            className="text-xs text-muted-foreground leading-relaxed cursor-pointer"
          >
            By providing a telephone number and checking this box, you consent
            to receive SMS text messages from Nextier regarding your account,
            services, and marketing when applicable. Nextier is a consultant,
            advisor, and owner of Nextier Technologies. Nextier Terminals are
            used for a variety of use cases and provide marketing and custom
            services when applicable. When you consent to receive messaging from
            Nextier, you are providing consent only to Nextier, not any third
            parties.{" "}
            <strong className="text-foreground">
              Your SMS opt-in data will never be shared or sold to third
              parties.
            </strong>{" "}
            Message frequency varies. Message & data rates may apply. Reply STOP
            to unsubscribe. Reply HELP for help. See our{" "}
            <Link
              href="/privacy"
              className="text-foreground underline hover:no-underline"
            >
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
    </div>
  );
};
