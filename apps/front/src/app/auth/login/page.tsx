import Link from "next/link";
import { LoginForm } from "@/features/auth/components/login-form";
import { Metadata } from "next";
import { getTitle } from "@/config/title";

export const metadata: Metadata = {
  title: getTitle("Login"),
};

export default function Page() {
  return (
    <div className="min-h-screen flex">
      {/* Left Side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-black p-12 flex-col justify-between relative overflow-hidden">
        {/* Subtle grid background */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:64px_64px]" />

        <div className="relative z-10 text-center">
          <h1 className="text-7xl font-black text-white tracking-tight">NEXTIER</h1>
          <p className="text-neutral-500 mt-2 text-xl tracking-wide">Turning Data into Deals</p>
        </div>

        <div className="space-y-10 relative z-10">
          <div>
            <p className="text-white font-black text-xs uppercase tracking-[0.25em] mb-6">
              Revenue Execution Engine
            </p>
            <p className="text-4xl text-white font-black leading-none tracking-tight">
              Data in. Deals out.
            </p>
            <p className="text-xl text-neutral-400 mt-6">
              We compress the time from first signal to real conversation.
            </p>
            <p className="text-neutral-600 mt-1 italic">
              Leads → Meetings → Proposals → Closed. Systematically.
            </p>
          </div>

          {/* Core Loop Visual */}
          <div className="flex flex-wrap gap-2">
            {["DATA", "CAMPAIGN", "SMS", "AI", "CALL", "CLOSE"].map((stage, i) => (
              <div key={stage} className="flex items-center">
                <span className="px-4 py-2 bg-white text-black text-xs font-black tracking-wider rounded">
                  {stage}
                </span>
                {i < 5 && <span className="mx-2 text-white font-black">→</span>}
              </div>
            ))}
          </div>

          {/* Differentiators - Blunt */}
          <div className="space-y-3 pt-6 border-t border-white/10">
            <p className="text-white">
              <span className="font-black">Audience agnostic.</span>
              <span className="text-neutral-500 ml-2">We don&apos;t care what you sell.</span>
            </p>
            <p className="text-white">
              <span className="font-black">Persona agnostic.</span>
              <span className="text-neutral-500 ml-2">Adapts to whoever you&apos;re chasing.</span>
            </p>
            <p className="text-white">
              <span className="font-black">Competes with nothing.</span>
              <span className="text-neutral-500 ml-2">This isn&apos;t a CRM. It&apos;s the execution layer.</span>
            </p>
            <p className="text-white">
              <span className="font-black">Integrates with everything.</span>
              <span className="text-neutral-500 ml-2">Your stack. We just make it work.</span>
            </p>
          </div>
        </div>

        <div className="relative z-10 space-y-3">
          <p className="text-xs text-neutral-700 uppercase tracking-[0.2em] font-medium">
            Stop talking about pipeline. Start closing it.
          </p>
          <p className="text-sm text-neutral-500">
            Seeking feedback and unique partnerships with the right people.
          </p>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Mobile Branding */}
          <div className="text-center mb-8 lg:hidden">
            <h1 className="text-3xl font-bold text-foreground">NEXTIER</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Revenue Execution Engine
            </p>
          </div>

          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-2">Welcome back</h2>
            <p className="text-muted-foreground">Sign in to your account</p>
          </div>

          <div className="bg-card p-6 rounded-lg border border-border">
            <LoginForm />
          </div>

          <div className="mt-6 text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              Need an account?{" "}
              <Link
                href="/auth/register"
                className="text-foreground hover:underline font-semibold"
              >
                Request access
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
    </div>
  );
}
