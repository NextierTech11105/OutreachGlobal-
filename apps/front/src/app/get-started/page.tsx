"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mail, Check, Building2, User } from "lucide-react";
import Image from "next/image";
import { APP_NAME, LOGO_URL } from "@/config/branding";

function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function extractDomain(email: string): string {
  const domain = email.split("@")[1] || "";
  return domain.replace(/\.(com|io|net|org|co)$/, "").split(".").pop() || "";
}

interface LeadCardData {
  email: string;
  domain: string;
  createdAt: string;
}

export default function GetStartedPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [leadCard, setLeadCard] = useState<LeadCardData | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("Please enter your email");
      return;
    }

    if (!validateEmail(email)) {
      setError("Please enter a valid email address");
      return;
    }

    setLoading(true);

    try {
      // Store email for session
      localStorage.setItem("og_user_email", email.trim());

      // Create lead card data
      setLeadCard({
        email: email.trim(),
        domain: extractDomain(email),
        createdAt: new Date().toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
      });
    } catch {
      setError("Failed to process. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = () => {
    window.location.href = "/auth";
  };

  return (
    <div className="min-h-screen bg-[#09090b] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          {LOGO_URL ? (
            <Image
              src={LOGO_URL}
              alt={APP_NAME}
              width={180}
              height={48}
              className="mx-auto mb-4"
            />
          ) : (
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl mx-auto mb-4 flex items-center justify-center">
              <span className="text-2xl font-bold text-white">
                {APP_NAME.charAt(0)}
              </span>
            </div>
          )}
          <h1 className="text-3xl font-bold text-white mb-2">{APP_NAME}</h1>
          <p className="text-zinc-400">
            {leadCard ? "Your lead card is ready" : "Enter your email to get started"}
          </p>
        </div>

        {/* Lead Card (shown after email submission) */}
        {leadCard ? (
          <div className="space-y-4">
            <div className="bg-gradient-to-br from-zinc-900 to-zinc-800 border border-zinc-700 rounded-xl p-6 shadow-xl">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                  <Check className="w-6 h-6 text-emerald-400" />
                </div>
                <span className="text-xs text-zinc-500 uppercase tracking-wider">
                  Lead Card
                </span>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-zinc-500" />
                  <span className="text-white font-medium">{leadCard.email}</span>
                </div>

                {leadCard.domain && (
                  <div className="flex items-center gap-3">
                    <Building2 className="w-4 h-4 text-zinc-500" />
                    <span className="text-zinc-400 capitalize">{leadCard.domain}</span>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <User className="w-4 h-4 text-zinc-500" />
                  <span className="text-zinc-500 text-sm">Added {leadCard.createdAt}</span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-zinc-700">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-500">Status</span>
                  <span className="text-xs font-medium text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded">
                    VERIFIED
                  </span>
                </div>
              </div>
            </div>

            <Button
              onClick={handleContinue}
              className="w-full h-12 bg-white text-black hover:bg-zinc-200 font-medium"
            >
              Continue to Dashboard
            </Button>
          </div>
        ) : (
          /* Email Entry Form */
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-zinc-300"
                >
                  Work Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    className="pl-10 bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 h-12"
                    autoComplete="email"
                  />
                </div>
                {error && <p className="text-red-500 text-sm">{error}</p>}
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 bg-white text-black hover:bg-zinc-200 font-medium"
              >
                {loading ? "Validating..." : "Get Started"}
              </Button>
            </form>
          </div>
        )}

        <p className="text-center text-zinc-500 text-sm mt-6">
          Already have an account?{" "}
          <a
            href="/auth"
            className="text-zinc-400 hover:text-white underline"
          >
            Sign in
          </a>
        </p>
      </div>
    </div>
  );
}
