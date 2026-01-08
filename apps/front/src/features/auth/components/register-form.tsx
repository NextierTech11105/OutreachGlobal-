"use client";

import { Button } from "@/components/ui/button";
import { FormItem } from "@/components/ui/form/form-item";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/input/password-input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FieldErrors } from "@/components/errors/field-errors";
import { useMutation } from "@apollo/client";
import { $cookie } from "@/lib/cookie/client-cookie";
import { addMonths } from "date-fns";
import { useApiError } from "@/hooks/use-api-error";
import { gql } from "@apollo/client";
import { toast } from "sonner";

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
    password: "",
    confirmPassword: "",
    companyName: "",
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

    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
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
            password: formData.password,
            companyName: formData.companyName || `${formData.name}'s Team`,
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

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? "Creating Account..." : "Create Account & Start Free Trial"}
      </Button>

      <p className="text-xs text-center text-muted-foreground">
        By signing up, you agree to our Terms of Service and Privacy Policy.
        <br />
        30-day free trial. No credit card required.
      </p>
    </form>
  );
};
