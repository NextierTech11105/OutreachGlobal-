"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { NextierLogo, NextierLogoIcon } from "@/components/brand/nextier-logo";
import { useRouter } from "next/navigation";
import {
  Phone,
  MessageSquare,
  Search,
  Brain,
  Zap,
  Shield,
  BarChart3,
  Users,
  Globe,
  ArrowRight,
  Play,
  CheckCircle2,
  Star,
  Building2,
  TrendingUp,
  Clock,
  Target,
} from "lucide-react";

const features = [
  {
    icon: Brain,
    title: "NEVA AI Research",
    description:
      "Deep business intelligence powered by AI. Validate leads, size markets, and build personas in seconds.",
    color: "from-cyan-500 to-blue-500",
  },
  {
    icon: Phone,
    title: "Power Dialer",
    description:
      "Click-to-call, auto-dialer, and call recording. Make 3x more calls with intelligent queue management.",
    color: "from-orange-500 to-red-500",
  },
  {
    icon: MessageSquare,
    title: "SMS Campaigns",
    description:
      "10DLC compliant bulk messaging with personalization. Automated follow-ups and cadence sequences.",
    color: "from-green-500 to-emerald-500",
  },
  {
    icon: Search,
    title: "Skip Tracing",
    description:
      "Find contact info for any property owner. Phone numbers, emails, and verified addresses.",
    color: "from-purple-500 to-pink-500",
  },
  {
    icon: BarChart3,
    title: "Deal Intelligence",
    description:
      "AI-powered deal scoring and pipeline analytics. Know which leads to prioritize.",
    color: "from-amber-500 to-orange-500",
  },
  {
    icon: Globe,
    title: "Chrome Extension",
    description:
      "Capture leads from anywhere on the web. LinkedIn, Zillow, any website with one click.",
    color: "from-blue-500 to-indigo-500",
  },
];

const stats = [
  { value: "10M+", label: "Leads Processed" },
  { value: "500K+", label: "Calls Made" },
  { value: "98%", label: "Data Accuracy" },
  { value: "3x", label: "Faster Outreach" },
];

const testimonials = [
  {
    quote:
      "NEXTIER replaced 5 different tools for us. The AI research alone saves my team 10 hours a week.",
    author: "Marcus Johnson",
    role: "CEO, Prime Acquisitions",
    avatar: "MJ",
  },
  {
    quote:
      "The power dialer is incredible. We went from 50 calls a day to 150. Our conversion rate doubled.",
    author: "Sarah Chen",
    role: "Sales Director, Atlas REI",
    avatar: "SC",
  },
  {
    quote:
      "Skip tracing accuracy is unmatched. We're connecting with 40% more property owners now.",
    author: "David Miller",
    role: "Founder, Miller Properties",
    avatar: "DM",
  },
];

const useCases = [
  {
    icon: Building2,
    title: "Real Estate Investors",
    description: "Find motivated sellers, skip trace owners, and close more deals",
  },
  {
    icon: TrendingUp,
    title: "Sales Teams",
    description: "Power dial through lists, automate follow-ups, hit quotas faster",
  },
  {
    icon: Users,
    title: "Marketing Agencies",
    description: "White-label the platform, resell to clients, scale your business",
  },
  {
    icon: Target,
    title: "Lead Gen Companies",
    description: "Enrich data, validate businesses, deliver quality leads",
  },
];

export default function LandingPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#0F172A] overflow-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0F172A]/80 backdrop-blur-xl border-b border-slate-800">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <NextierLogo size="sm" />
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-slate-400 hover:text-white transition">
                Features
              </a>
              <a href="#how-it-works" className="text-slate-400 hover:text-white transition">
                How It Works
              </a>
              <a href="/pricing" className="text-slate-400 hover:text-white transition">
                Pricing
              </a>
              <a href="#testimonials" className="text-slate-400 hover:text-white transition">
                Testimonials
              </a>
            </div>
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                className="text-slate-300 hover:text-white"
                onClick={() => router.push("/auth/login")}
              >
                Login
              </Button>
              <Button
                className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white"
                onClick={() => router.push("/signup")}
              >
                Start Free Trial
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4">
        {/* Background Effects */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-orange-500/20 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-r from-cyan-500/5 to-orange-500/5 rounded-full blur-3xl" />
        </div>

        <div className="container mx-auto text-center relative z-10">
          <Badge className="mb-6 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-400 border-cyan-500/30 px-4 py-2">
            <Zap className="w-4 h-4 mr-2 inline" />
            AI-Powered Sales Intelligence Platform
          </Badge>

          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
            <span className="text-white">Close More Deals</span>
            <br />
            <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">
              With AI-Powered
            </span>
            <br />
            <span className="bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent">
              Sales Intelligence
            </span>
          </h1>

          <p className="text-xl text-slate-400 max-w-3xl mx-auto mb-10">
            NEXTIER combines AI research, power dialing, SMS campaigns, and skip
            tracing into one platform. Find leads, validate businesses, and close
            deals faster than ever.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Button
              size="lg"
              className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white text-lg px-8 py-6"
              onClick={() => router.push("/signup?plan=pro")}
            >
              Start Free Trial
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-slate-700 text-white hover:bg-slate-800 text-lg px-8 py-6"
              onClick={() => router.push("/demo")}
            >
              <Play className="mr-2 h-5 w-5" />
              Watch Demo
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent mb-2">
                  {stat.value}
                </div>
                <div className="text-slate-500">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trusted By */}
      <section className="py-12 border-y border-slate-800 bg-slate-900/30">
        <div className="container mx-auto px-4">
          <p className="text-center text-slate-500 mb-8">
            TRUSTED BY LEADING SALES TEAMS
          </p>
          <div className="flex flex-wrap justify-center items-center gap-12 opacity-50">
            {["Apollo", "Outreach", "Salesloft", "HubSpot", "Salesforce"].map(
              (brand) => (
                <div key={brand} className="text-2xl font-bold text-slate-600">
                  {brand}
                </div>
              )
            )}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-orange-500/20 text-orange-400 border-orange-500/30">
              Features
            </Badge>
            <h2 className="text-4xl font-bold text-white mb-4">
              Everything You Need to Close Deals
            </h2>
            <p className="text-xl text-slate-400 max-w-2xl mx-auto">
              One platform. All the tools. No more juggling 10 different apps.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <Card
                  key={feature.title}
                  className="bg-slate-900/50 border-slate-800 hover:border-slate-700 transition group"
                >
                  <CardContent className="p-6">
                    <div
                      className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} p-3 mb-4 group-hover:scale-110 transition`}
                    >
                      <Icon className="w-full h-full text-white" />
                    </div>
                    <h3 className="text-xl font-semibold text-white mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-slate-400">{feature.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24 px-4 bg-slate-900/30">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-cyan-500/20 text-cyan-400 border-cyan-500/30">
              How It Works
            </Badge>
            <h2 className="text-4xl font-bold text-white mb-4">
              From Lead to Close in 4 Steps
            </h2>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            {[
              {
                step: "01",
                title: "Import or Find Leads",
                description:
                  "Upload your list, use our Chrome extension, or search our database",
              },
              {
                step: "02",
                title: "AI Research & Validation",
                description:
                  "NEVA validates businesses, enriches data, and scores lead quality",
              },
              {
                step: "03",
                title: "Multi-Channel Outreach",
                description:
                  "Power dial, send SMS campaigns, and automate follow-up sequences",
              },
              {
                step: "04",
                title: "Close & Track",
                description:
                  "Manage pipeline, track conversions, and optimize your process",
              },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="text-6xl font-bold bg-gradient-to-r from-cyan-500/20 to-blue-500/20 bg-clip-text text-transparent mb-4">
                  {item.step}
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">
                  {item.title}
                </h3>
                <p className="text-slate-400">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="py-24 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-purple-500/20 text-purple-400 border-purple-500/30">
              Use Cases
            </Badge>
            <h2 className="text-4xl font-bold text-white mb-4">
              Built for Sales-Driven Teams
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {useCases.map((useCase) => {
              const Icon = useCase.icon;
              return (
                <Card
                  key={useCase.title}
                  className="bg-slate-900/50 border-slate-800 text-center p-6"
                >
                  <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mx-auto mb-4">
                    <Icon className="w-8 h-8 text-cyan-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white mb-2">
                    {useCase.title}
                  </h3>
                  <p className="text-slate-400 text-sm">{useCase.description}</p>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-24 px-4 bg-slate-900/30">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-green-500/20 text-green-400 border-green-500/30">
              Testimonials
            </Badge>
            <h2 className="text-4xl font-bold text-white mb-4">
              Loved by Sales Teams
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial) => (
              <Card
                key={testimonial.author}
                className="bg-slate-900/50 border-slate-800"
              >
                <CardContent className="p-6">
                  <div className="flex gap-1 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className="w-5 h-5 fill-amber-400 text-amber-400"
                      />
                    ))}
                  </div>
                  <p className="text-slate-300 mb-6 italic">
                    "{testimonial.quote}"
                  </p>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-white font-bold">
                      {testimonial.avatar}
                    </div>
                    <div>
                      <div className="text-white font-semibold">
                        {testimonial.author}
                      </div>
                      <div className="text-slate-500 text-sm">
                        {testimonial.role}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4">
        <div className="container mx-auto">
          <Card className="bg-gradient-to-r from-cyan-600 via-blue-600 to-cyan-600 border-0 overflow-hidden">
            <CardContent className="py-16 text-center relative">
              <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
              <div className="relative z-10">
                <NextierLogoIcon size={64} className="mx-auto mb-6" />
                <h2 className="text-4xl font-bold text-white mb-4">
                  Ready to Close More Deals?
                </h2>
                <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
                  Join thousands of sales professionals using NEXTIER to find
                  leads, make calls, and close deals faster.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button
                    size="lg"
                    className="bg-white text-blue-600 hover:bg-blue-50 text-lg px-8"
                    onClick={() => router.push("/signup?plan=pro")}
                  >
                    Start Free 14-Day Trial
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="border-white/30 text-white hover:bg-white/10 text-lg px-8"
                    onClick={() => router.push("/pricing")}
                  >
                    View Pricing
                  </Button>
                </div>
                <p className="text-blue-200 mt-6 text-sm">
                  <CheckCircle2 className="w-4 h-4 inline mr-2" />
                  No credit card required • Cancel anytime
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t border-slate-800">
        <div className="container mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-12">
            <div>
              <NextierLogo size="sm" className="mb-4" />
              <p className="text-slate-500 text-sm">
                AI-powered sales intelligence platform for modern sales teams.
              </p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-slate-500">
                <li>
                  <a href="#features" className="hover:text-white transition">
                    Features
                  </a>
                </li>
                <li>
                  <a href="/pricing" className="hover:text-white transition">
                    Pricing
                  </a>
                </li>
                <li>
                  <a href="/docs" className="hover:text-white transition">
                    API Docs
                  </a>
                </li>
                <li>
                  <a href="/changelog" className="hover:text-white transition">
                    Changelog
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-slate-500">
                <li>
                  <a href="/about" className="hover:text-white transition">
                    About
                  </a>
                </li>
                <li>
                  <a href="/blog" className="hover:text-white transition">
                    Blog
                  </a>
                </li>
                <li>
                  <a href="/careers" className="hover:text-white transition">
                    Careers
                  </a>
                </li>
                <li>
                  <a href="/contact" className="hover:text-white transition">
                    Contact
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-slate-500">
                <li>
                  <a href="/privacy" className="hover:text-white transition">
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a href="/terms" className="hover:text-white transition">
                    Terms of Service
                  </a>
                </li>
                <li>
                  <a href="/security" className="hover:text-white transition">
                    Security
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="flex flex-col md:flex-row justify-between items-center pt-8 border-t border-slate-800">
            <p className="text-slate-500 text-sm">
              © 2025 NEXTIER. All rights reserved.
            </p>
            <div className="flex gap-6 mt-4 md:mt-0">
              <a href="#" className="text-slate-500 hover:text-white transition">
                Twitter
              </a>
              <a href="#" className="text-slate-500 hover:text-white transition">
                LinkedIn
              </a>
              <a href="#" className="text-slate-500 hover:text-white transition">
                GitHub
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
