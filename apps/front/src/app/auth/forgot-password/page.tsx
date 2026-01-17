"use client";

import { Button } from "@/components/ui/button";
import { FormItem } from "@/components/ui/form/form-item";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      toast.error("Please enter your email address");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to send reset email");
      }

      setSent(true);
      toast.success("Reset email sent!");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to send reset email"
      );
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-background to-muted/20">
        <div className="w-full max-w-md text-center">
          <div className="bg-card p-8 rounded-lg border border-border shadow-lg">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">
              Check Your Email
            </h1>
            <p className="text-muted-foreground mb-6">
              We sent a password reset link to <strong>{email}</strong>. Click
              the link in the email to reset your password.
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              Didn't receive the email? Check your spam folder or{" "}
              <button
                onClick={() => setSent(false)}
                className="text-foreground underline hover:no-underline"
              >
                try again
              </button>
            </p>
            <Link
              href="/auth/login"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              ← Back to login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-background to-muted/20">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Reset Password
          </h1>
          <p className="text-muted-foreground">
            Enter your email and we'll send you a reset link.
          </p>
        </div>

        <div className="bg-card p-6 rounded-lg border border-border shadow-lg">
          <form className="space-y-4" onSubmit={handleSubmit}>
            <FormItem>
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoFocus
              />
            </FormItem>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Sending..." : "Send Reset Link"}
            </Button>
          </form>
        </div>

        <div className="mt-6 text-center">
          <Link
            href="/auth/login"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}
