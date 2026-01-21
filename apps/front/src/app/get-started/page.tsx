"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Zap, Shield, BarChart3 } from "lucide-react";

/**
 * LANDING PAGE
 * Entry point for new visitors - explains what NEXTIER does
 */
export default function GetStartedPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      {/* Hero */}
      <div className="flex flex-col items-center justify-center min-h-screen px-6 text-center">
        <div className="max-w-3xl mx-auto">
          <p className="text-xs font-semibold uppercase tracking-[0.5em] text-zinc-500 mb-6">
            NEXTIER DATA ENGINE
          </p>

          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
            Turn data into
            <span className="text-blue-500"> deals</span>
          </h1>

          <p className="text-xl text-zinc-400 max-w-2xl mx-auto mb-10">
            AI-powered outreach platform. Skip trace, verify, and reach decision makers with compliant SMS campaigns.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Button size="lg" className="px-8 py-6 text-lg bg-blue-600 hover:bg-blue-700" asChild>
              <Link href="/login">
                Sign In
                <ArrowRight className="ml-2 w-5 h-5" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="px-8 py-6 text-lg border-zinc-700 hover:bg-zinc-900" asChild>
              <Link href="/contact">
                Contact Sales
              </Link>
            </Button>
          </div>

          {/* Features */}
          <div className="grid md:grid-cols-3 gap-6 text-left">
            <div className="p-6 rounded-xl bg-zinc-900/50 border border-zinc-800">
              <Zap className="w-8 h-8 text-blue-500 mb-4" />
              <h3 className="font-semibold text-lg mb-2">Skip Trace at Scale</h3>
              <p className="text-zinc-500 text-sm">2,000 leads/day. Tracerfy integration finds mobile numbers automatically.</p>
            </div>
            <div className="p-6 rounded-xl bg-zinc-900/50 border border-zinc-800">
              <Shield className="w-8 h-8 text-green-500 mb-4" />
              <h3 className="font-semibold text-lg mb-2">TCPA Compliant</h3>
              <p className="text-zinc-500 text-sm">DNC checking, opt-out handling, litigator detection. LUCI guards every send.</p>
            </div>
            <div className="p-6 rounded-xl bg-zinc-900/50 border border-zinc-800">
              <BarChart3 className="w-8 h-8 text-purple-500 mb-4" />
              <h3 className="font-semibold text-lg mb-2">10DLC Ready</h3>
              <p className="text-zinc-500 text-sm">SignalHouse carrier-grade delivery. Proper throughput, proper compliance.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
