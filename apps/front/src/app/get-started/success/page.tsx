"use client";

import { useSearchParams } from "next/navigation";
import { Check, Mail, Key, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Suspense } from "react";

function SuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-6">
      <div className="max-w-lg w-full text-center">
        {/* Success Icon */}
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center mx-auto mb-8">
          <Check className="w-10 h-10 text-white" />
        </div>

        <h1 className="text-4xl font-bold text-white mb-4">
          Payment Successful!
        </h1>

        <p className="text-xl text-white/70 mb-8">
          Your API keys are on their way.
        </p>

        {/* What happens next */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-left mb-8">
          <h2 className="text-lg font-semibold text-white mb-6">
            What happens next:
          </h2>

          <div className="space-y-6">
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center flex-shrink-0">
                <Mail className="w-5 h-5 text-violet-400" />
              </div>
              <div>
                <div className="text-white font-medium">Check your email</div>
                <div className="text-white/60 text-sm">
                  Your API keys will arrive within 2-3 minutes. Check spam if
                  you don't see it.
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center flex-shrink-0">
                <Key className="w-5 h-5 text-violet-400" />
              </div>
              <div>
                <div className="text-white font-medium">Save your keys</div>
                <div className="text-white/60 text-sm">
                  You'll receive a PRODUCTION key and a DEV key. The production
                  key is shown only once - save it!
                </div>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center flex-shrink-0">
                <ArrowRight className="w-5 h-5 text-violet-400" />
              </div>
              <div>
                <div className="text-white font-medium">Book strategy session</div>
                <div className="text-white/60 text-sm">
                  The email includes a link to book your onboarding call. This
                  activates full execution access.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Important Note */}
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-left mb-8">
          <div className="flex gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <div className="text-amber-200 font-medium">Important</div>
              <div className="text-amber-200/80 text-sm">
                Your API keys are shown only once in the email. Copy and save
                them immediately.
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-4">
          <Link href="/" className="block">
            <Button className="w-full h-12 bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 font-semibold">
              Go to Dashboard
            </Button>
          </Link>

          <p className="text-white/40 text-sm">
            Questions?{" "}
            <a
              href="mailto:tb@outreachglobal.io"
              className="text-white/60 hover:text-white"
            >
              tb@outreachglobal.io
            </a>
          </p>
        </div>

        {sessionId && (
          <p className="text-white/30 text-xs mt-8">
            Session: {sessionId.slice(0, 20)}...
          </p>
        )}
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
          <div className="text-white">Loading...</div>
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
