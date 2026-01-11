"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Mail,
  Check,
  Building2,
  User,
  Target,
  TrendingUp,
  Users,
  ArrowRight,
  Play,
  Zap,
  Database,
  Bot,
  MessageSquare,
  Calendar,
  Award,
  Layers,
  Repeat,
  Rocket,
  BarChart3,
  Shield,
  Phone,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { APP_NAME } from "@/config/branding";

function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function extractDomain(email: string): string {
  const domain = email.split("@")[1] || "";
  return (
    domain
      .replace(/\.(com|io|net|org|co)$/, "")
      .split(".")
      .pop() || ""
  );
}

interface LeadCardData {
  email: string;
  domain: string;
  createdAt: string;
}

const FEATURES = [
  {
    icon: Database,
    title: "Build-to-Suit Datalakes",
    desc: "Custom data infrastructure tailored to your vertical",
  },
  {
    icon: Bot,
    title: "Co-Pilot Managed Campaigns",
    desc: "AI handles execution while you focus on closing",
  },
  {
    icon: MessageSquare,
    title: "SMS & Email Vacuums",
    desc: "Compound every contact into deeper engagement",
  },
  {
    icon: Calendar,
    title: "15-Min Discovery Meetings",
    desc: "Powerful conversations that establish authority",
  },
  {
    icon: Award,
    title: "Authority & Respect",
    desc: "Position yourself as the expert in your field",
  },
  {
    icon: Layers,
    title: "Multi-Channel Sync",
    desc: "SMS, Email, Voice - orchestrated perfectly",
  },
  {
    icon: Repeat,
    title: "Compound Engagement",
    desc: "Every touch multiplies the next one's impact",
  },
  {
    icon: Target,
    title: "Precision Targeting",
    desc: "USBizData-powered lead intelligence",
  },
  {
    icon: Rocket,
    title: "Instant Deployment",
    desc: "Launch campaigns in minutes, not weeks",
  },
  {
    icon: Shield,
    title: "White-Label Ready",
    desc: "Your brand, your platform, your clients",
  },
];

export default function GetStartedPage() {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
  });
  const [smsConsent, setSmsConsent] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [leadCard, setLeadCard] = useState<LeadCardData | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = "First name is required";
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = "Last name is required";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!validateEmail(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!formData.phone.trim()) {
      newErrors.phone = "Phone number is required";
    }

    if (!smsConsent) {
      newErrors.smsConsent = "SMS consent is required";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setLoading(true);

    try {
      // Store lead data
      const leadData = {
        ...formData,
        phone: formData.phone.startsWith("+1") ? formData.phone : `+1${formData.phone.replace(/\D/g, "")}`,
        smsConsent,
        createdAt: new Date().toISOString(),
      };
      localStorage.setItem("og_user_lead", JSON.stringify(leadData));
      localStorage.setItem("og_user_email", formData.email.trim());

      setLeadCard({
        email: formData.email.trim(),
        domain: extractDomain(formData.email),
        createdAt: new Date().toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
      });
    } catch {
      setErrors({ submit: "Failed to process. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = () => {
    window.location.href = "/auth";
  };

  return (
    <div className="min-h-screen bg-black overflow-hidden">
      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-6 lg:px-12">
        <Image
          src="/nextier-logo.jpg"
          alt={APP_NAME}
          width={300}
          height={100}
          className="h-24 lg:h-32 w-auto"
        />
        <a
          href="/auth"
          className="text-sm text-zinc-400 hover:text-white transition"
        >
          Sign In
        </a>
      </nav>

      <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-12 pt-12 lg:pt-20">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left - Hero Content */}
          <div className="space-y-8">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-2">
              <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
              <span className="text-sm text-white font-semibold tracking-wider">
                REVENUE EXECUTION ENGINE
              </span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl lg:text-6xl font-bold text-white leading-tight">
              Amplify Capabilities.
              <br />
              <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                Multiply Capacity.
              </span>
            </h1>

            {/* Subheadline */}
            <p className="text-lg lg:text-xl text-zinc-400 max-w-lg">
              Nextier Deal Terminals. A modern-day terminal built to close
              deals. Audience agnostic. Persona agnostic. Adapts to your
              industry and use case.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-wrap gap-4">
              <Button
                size="lg"
                className="bg-white text-black hover:bg-zinc-200 h-14 px-8 text-base font-semibold"
                onClick={() =>
                  document.getElementById("email-form")?.scrollIntoView({ behavior: "smooth" })
                }
              >
                Learn More
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-zinc-700 text-white hover:bg-zinc-800 h-14 px-8 text-base"
              >
                <Play className="w-5 h-5 mr-2" />
                Watch Demo
              </Button>
            </div>
          </div>

          {/* Right - Email Form or Lead Card */}
          <div id="email-form" className="lg:pl-8">
            {leadCard ? (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="bg-gradient-to-br from-zinc-900 to-zinc-800 border border-zinc-700 rounded-2xl p-8 shadow-2xl">
                  <div className="flex items-start justify-between mb-6">
                    <div className="w-14 h-14 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                      <Check className="w-7 h-7 text-emerald-400" />
                    </div>
                    <span className="text-xs text-zinc-500 uppercase tracking-wider">
                      Lead Card
                    </span>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Mail className="w-5 h-5 text-zinc-500" />
                      <span className="text-lg text-white font-medium">
                        {leadCard.email}
                      </span>
                    </div>

                    {leadCard.domain && (
                      <div className="flex items-center gap-3">
                        <Building2 className="w-5 h-5 text-zinc-500" />
                        <span className="text-zinc-400 capitalize">
                          {leadCard.domain}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center gap-3">
                      <User className="w-5 h-5 text-zinc-500" />
                      <span className="text-zinc-500 text-sm">
                        Added {leadCard.createdAt}
                      </span>
                    </div>
                  </div>

                  <div className="mt-6 pt-6 border-t border-zinc-700">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-zinc-500">Status</span>
                      <span className="text-sm font-medium text-emerald-400 bg-emerald-400/10 px-3 py-1.5 rounded-full">
                        VERIFIED
                      </span>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={handleContinue}
                  className="w-full h-14 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold text-lg"
                >
                  Continue to Dashboard
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </div>
            ) : (
              <div className="bg-zinc-900/80 backdrop-blur-xl border border-zinc-800 rounded-2xl p-8 shadow-2xl">
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold text-white mb-2">
                    Learn About Our Products
                  </h2>
                  <p className="text-zinc-400">
                    Input your information below
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* First Name */}
                  <div className="space-y-1">
                    <label htmlFor="firstName" className="block text-sm font-medium text-zinc-300">
                      First name <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                      <Input
                        id="firstName"
                        type="text"
                        value={formData.firstName}
                        onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                        placeholder="Type your answer here..."
                        className="pl-12 bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 h-12 text-base rounded-xl"
                      />
                    </div>
                    {errors.firstName && <p className="text-red-400 text-sm">{errors.firstName}</p>}
                  </div>

                  {/* Last Name */}
                  <div className="space-y-1">
                    <label htmlFor="lastName" className="block text-sm font-medium text-zinc-300">
                      Last name <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                      <Input
                        id="lastName"
                        type="text"
                        value={formData.lastName}
                        onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                        placeholder="Type your answer here..."
                        className="pl-12 bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 h-12 text-base rounded-xl"
                      />
                    </div>
                    {errors.lastName && <p className="text-red-400 text-sm">{errors.lastName}</p>}
                  </div>

                  {/* Email */}
                  <div className="space-y-1">
                    <label htmlFor="email" className="block text-sm font-medium text-zinc-300">
                      Email <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="Type your answer here..."
                        className="pl-12 bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 h-12 text-base rounded-xl"
                        autoComplete="email"
                      />
                    </div>
                    {errors.email && <p className="text-red-400 text-sm">{errors.email}</p>}
                  </div>

                  {/* Phone */}
                  <div className="space-y-1">
                    <label htmlFor="phone" className="block text-sm font-medium text-zinc-300">
                      Phone <span className="text-red-400">*</span>
                    </label>
                    <div className="flex">
                      <span className="inline-flex items-center px-3 rounded-l-xl border border-r-0 border-zinc-700 bg-zinc-800 text-zinc-400 text-sm">
                        +1
                      </span>
                      <Input
                        id="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="(555) 123-4567"
                        className="rounded-l-none bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 h-12 text-base rounded-r-xl"
                      />
                    </div>
                    {errors.phone && <p className="text-red-400 text-sm">{errors.phone}</p>}
                  </div>

                  {/* SMS Consent */}
                  <div className="flex items-start space-x-3 pt-2">
                    <Checkbox
                      id="smsConsent"
                      checked={smsConsent}
                      onCheckedChange={(checked) => setSmsConsent(checked === true)}
                      className="mt-1 border-zinc-600 data-[state=checked]:bg-white data-[state=checked]:text-black"
                    />
                    <label htmlFor="smsConsent" className="text-xs text-zinc-400 leading-relaxed cursor-pointer">
                      By providing a telephone number, clicking this button, and submitting this form, you consent to receive SMS text messages from Nextier regarding new offers and marketing. Message frequency varies. Message & data rates may apply. Reply STOP to unsubscribe. Reply HELP for more information.
                      {" "}Nextier is a consultant, advisor, and owner of Nextier Technologies. When you consent to receive messaging from Nextier, you are providing consent only to Nextier, not any third parties.
                      {" "}<strong className="text-zinc-300">Your SMS opt-in data will never be shared or sold to third parties.</strong>
                      {" "}See our{" "}
                      <Link href="/privacy" className="text-zinc-300 underline hover:no-underline">
                        Privacy Policy
                      </Link>{" "}
                      (containing our SMS Terms) for more information.
                    </label>
                  </div>
                  {errors.smsConsent && <p className="text-red-400 text-sm ml-6">{errors.smsConsent}</p>}

                  <Button
                    type="submit"
                    disabled={loading || !smsConsent}
                    className="w-full h-14 bg-white text-black hover:bg-zinc-200 font-semibold text-lg rounded-xl disabled:opacity-50"
                  >
                    {loading ? "Submitting..." : "Submit"}
                  </Button>

                  <p className="text-center text-zinc-600 text-xs">
                    <Link href="/terms" className="hover:text-zinc-400">Terms of Service</Link>
                    {" | "}
                    <Link href="/privacy" className="hover:text-zinc-400">Privacy Policy</Link>
                  </p>
                </form>
              </div>
            )}
          </div>
        </div>

        {/* Perfect Fit Section */}
        <div className="mt-24 lg:mt-32">
          <h3 className="text-center text-2xl font-bold text-white mb-4">
            Perfect Fit For
          </h3>
          <p className="text-center text-zinc-500 mb-10 max-w-2xl mx-auto">
            Built for professionals who need to scale outreach without scaling
            headcount
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {[
              "Solopreneurs",
              "Service-Based Businesses",
              "RE Agents & Brokers",
              "White-Label Agencies",
              "Tech Consultants",
              "CRM Consultants",
              "Founders",
            ].map((item) => (
              <span
                key={item}
                className="px-4 py-2 bg-zinc-800/80 border border-zinc-700 rounded-full text-sm text-white hover:border-blue-500/50 hover:bg-zinc-800 transition-colors cursor-default"
              >
                {item}
              </span>
            ))}
          </div>
        </div>

        {/* Features Grid */}
        <div className="mt-20 pb-20">
          <h3 className="text-center text-2xl font-bold text-white mb-12">
            Everything You Need to Scale Outreach
          </h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-4">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6 hover:border-zinc-700 transition group"
              >
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-lg flex items-center justify-center mb-4 group-hover:from-blue-500/30 group-hover:to-purple-500/30 transition">
                  <feature.icon className="w-6 h-6 text-blue-400" />
                </div>
                <h4 className="text-lg font-semibold text-white mb-2">
                  {feature.title}
                </h4>
                <p className="text-zinc-500 text-sm">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
