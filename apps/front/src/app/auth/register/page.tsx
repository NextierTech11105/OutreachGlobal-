import Link from "next/link";
import { RegisterForm } from "@/features/auth/components/register-form";
import { Metadata } from "next";
import { getTitle } from "@/config/title";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: getTitle("Create Account"),
};

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-background to-muted/20">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Request Access
          </h1>
          <p className="text-muted-foreground">
            Join the revenue execution engine.
          </p>
        </div>

        <div className="bg-card p-6 rounded-lg border border-border shadow-lg">
          <Suspense fallback={<div>Loading...</div>}>
            <RegisterForm />
          </Suspense>
        </div>

        <div className="mt-6 text-center space-y-2">
          <p className="text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link
              href="/auth/login"
              className="text-foreground hover:underline font-semibold"
            >
              Sign in
            </Link>
          </p>
          <Link
            href="/"
            className="text-sm text-muted-foreground hover:text-foreground block"
          >
            ← Back to homepage
          </Link>
        </div>
      </div>
    </div>
  );
}
