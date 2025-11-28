import Link from "next/link";
import { LoginForm } from "@/features/auth/components/login-form";
import { Metadata } from "next";
import { getTitle } from "@/config/title";

export const metadata: Metadata = {
  title: getTitle("Login"),
};

export default function Page() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Login</h1>
        </div>

        <div className="bg-card p-6 rounded-lg border border-border">
          <LoginForm />
        </div>

        <div className="mt-8 text-center">
          <Link
            href="/"
            className="text-sm text-muted-foreground hover:text-primary"
          >
            ← Back to homepage
          </Link>
        </div>
      </div>
    </div>
  );
}
