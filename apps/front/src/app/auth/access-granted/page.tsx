"use client";

import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, Calendar, ArrowRight } from "lucide-react";
import Link from "next/link";

const CONTACT_EMAIL = "tb@outreachglobal.io";

export default function AccessGrantedPage() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";
  const name = searchParams.get("name") || "";
  const firstName = name.split(" ")[0] || "there";

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full bg-slate-900 border-slate-800">
        <CardContent className="p-8 text-center">
          <div className="mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/20 mb-4">
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>
            <h1 className="text-2xl font-bold mb-2">
              Access Granted, {firstName}!
            </h1>
            <p className="text-slate-400">
              You have <span className="text-green-400 font-semibold">2 weeks</span> of read-only access to explore NEXTIER.
            </p>
          </div>

          <div className="space-y-4 mb-8">
            <div className="flex items-center gap-3 text-left p-3 bg-slate-800/50 rounded-lg">
              <Calendar className="h-5 w-5 text-sky-400 shrink-0" />
              <div>
                <p className="text-sm font-medium">Trial Period</p>
                <p className="text-xs text-slate-400">14 days starting today</p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm text-slate-400 mb-4">
              Want to see what NEXTIER can do for your business?
            </p>
            <a href={`mailto:${CONTACT_EMAIL}?subject=NEXTIER Discovery Call&body=Hi, I'd like to schedule a 15-min discovery call to learn more about NEXTIER.`}>
              <Button className="w-full bg-gradient-to-r from-sky-500 to-sky-600">
                Request Discovery Call
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </a>
            <Link href="/">
              <Button variant="outline" className="w-full border-slate-700">
                Back to Homepage
              </Button>
            </Link>
          </div>

          <p className="text-xs text-slate-500 mt-6">
            We'll send updates to {email}
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
