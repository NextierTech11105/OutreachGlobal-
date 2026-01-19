"use client";

import { type SVGProps, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Mail,
  Check,
  Building2,
  User,
  ArrowRight,
  Database,
  Bot,
  MessageSquare,
  Award,
  Layers,
  Repeat,
  Rocket,
  Shield,
  Target,
  Phone,
} from "lucide-react";
import Link from "next/link";

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
    icon: Phone,
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

const DEEP_DIVE = [
  {
    title: "Data & Targeting",
    icon: Database,
    points: [
      "Build-to-Suit Datalakes",
      "Precision Targeting",
      "Instant Deployment",
    ],
  },
  {
    title: "Orchestration",
    icon: Layers,
    points: [
      "Co-Pilot Managed Campaigns",
      "Multi-Channel Sync",
      "Compound Engagement",
    ],
  },
  {
    title: "Authority & Conversion",
    icon: Award,
    points: [
      "Authority & Respect",
      "15-Min Discovery Meetings",
      "White-Label Ready",
    ],
  },
];

const STEPS = [
  {
    title: "Map & Ingest",
    desc: "Pin your audience, pull signals, and hydrate the terminal with clean inputs.",
  },
  {
    title: "Launch with Guardrails",
    desc: "AI-managed cadences route across SMS, email, and voice with throttles and consent logic.",
  },
  {
    title: "Review & Close",
    desc: "See outcomes in the Deal Terminal, book the 15-min discovery, and push to execution platforms.",
  },
];

function NextierMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 120 120" role="img" aria-label="Nextier mark" {...props}>
      <defs>
        <linearGradient id="nextier-left" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#29b6ff" />
          <stop offset="100%" stopColor="#2f6bff" />
        </linearGradient>
        <linearGradient id="nextier-right" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ff8a3d" />
          <stop offset="100%" stopColor="#ff3f6f" />
        </linearGradient>
        <linearGradient id="nextier-core" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#2cd3ff" />
          <stop offset="100%" stopColor="#1a7dff" />
        </linearGradient>
      </defs>
      <path
        d="M14 18 L58 60 L14 102 L42 102 L86 60 L42 18 Z"
        fill="url(#nextier-left)"
      />
      <path
        d="M106 18 L62 60 L106 102 L78 102 L34 60 L78 18 Z"
        fill="url(#nextier-right)"
      />
      <path
        d="M60 38 L75 48 L75 66 L60 76 L45 66 L45 48 Z"
        fill="url(#nextier-core)"
        stroke="#0b1a3a"
        strokeWidth="2"
      />
      <path
        d="M60 46 L68 52 L68 62 L60 68 L52 62 L52 52 Z"
        fill="#0d1f4f"
        opacity="0.7"
      />
    </svg>
  );
}

function NextierLogo() {
  return (
    <div className="flex items-center gap-3">
      <NextierMark className="h-12 w-12 drop-shadow-[0_10px_40px_rgba(59,130,246,0.35)]" />
      <div className="text-2xl font-semibold tracking-tight">
        <span className="text-white">NEXT</span>
        <span className="bg-gradient-to-r from-orange-300 via-pink-400 to-red-500 bg-clip-text text-transparent">
          IER
        </span>
      </div>
    </div>
  );
}

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
      // Format phone number
      const phone = formData.phone.startsWith("+1")
        ? formData.phone
        : `+1${formData.phone.replace(/\D/g, "")}`;

      // Submit to API
      const response = await fetch("/api/leads/capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          email: formData.email.trim(),
          phone,
          smsConsent,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to submit");
      }

      // Store in localStorage for session continuity
      localStorage.setItem("og_user_lead", JSON.stringify(data.lead));
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
    } catch (err) {
      setErrors({ submit: err instanceof Error ? err.message : "Failed to process. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#05070f] text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-40 top-0 h-96 w-96 rounded-full bg-gradient-to-br from-blue-500/30 via-indigo-500/10 to-transparent blur-3xl" />
        <div className="absolute right-[-10%] top-32 h-[28rem] w-[28rem] rounded-full bg-gradient-to-bl from-orange-400/25 via-pink-400/15 to-transparent blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-gradient-to-tr from-cyan-400/15 via-sky-500/10 to-transparent blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(59,130,246,0.08),transparent_35%),radial-gradient(circle_at_70%_10%,rgba(244,114,182,0.08),transparent_25%)]" />
      </div>

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-6 lg:px-12">
        <NextierLogo />
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

            {/* CTA Button */}
            <div className="flex flex-wrap gap-4">
              <Button
                size="lg"
                className="bg-white text-black hover:bg-zinc-200 h-14 px-8 text-base font-semibold"
                onClick={() =>
                  document
                    .getElementById("email-form")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
              >
                Learn More
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </div>
          </div>

          {/* Right - Email Form or Lead Card */}
          <div id="email-form" className="lg:pl-8">
            {leadCard ? (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="bg-gradient-to-br from-zinc-900 to-zinc-800 border border-emerald-500/30 rounded-2xl p-8 shadow-2xl">
                  <div className="flex items-start justify-between mb-6">
                    <div className="w-14 h-14 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                      <Check className="w-7 h-7 text-emerald-400" />
                    </div>
                    <span className="text-xs text-emerald-400 uppercase tracking-wider font-semibold">
                      Request Received
                    </span>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-2xl font-bold text-white">
                      Thanks for reaching out!
                    </h3>
                    <p className="text-zinc-400">
                      I&apos;ll give you a call within 24 hours to discuss your outreach goals. Keep an eye on your phone!
                    </p>

                    <div className="pt-4 space-y-3">
                      <div className="flex items-center gap-3">
                        <Mail className="w-5 h-5 text-zinc-500" />
                        <span className="text-white">{leadCard.email}</span>
                      </div>

                      {leadCard.domain && (
                        <div className="flex items-center gap-3">
                          <Building2 className="w-5 h-5 text-zinc-500" />
                          <span className="text-zinc-400 capitalize">
                            {leadCard.domain}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-6 pt-6 border-t border-zinc-700">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-zinc-500">Status</span>
                      <span className="text-sm font-medium text-emerald-400 bg-emerald-400/10 px-3 py-1.5 rounded-full">
                        IN CALL QUEUE
                      </span>
                    </div>
                  </div>
                </div>

                <p className="text-center text-zinc-500 text-sm">
                  Questions? Email <a href="mailto:tb@outreachglobal.io" className="text-zinc-300 hover:text-white">tb@outreachglobal.io</a>
                </p>
              </div>
            ) : (
              <div className="bg-zinc-900/80 backdrop-blur-xl border border-zinc-800 rounded-2xl p-8 shadow-2xl">
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold text-white mb-2">
                    Learn About Our Products
                  </h2>
                  <p className="text-zinc-400">Input your information below</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* First Name */}
                  <div className="space-y-1">
                    <label
                      htmlFor="firstName"
                      className="block text-sm font-medium text-zinc-300"
                    >
                      First name <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                      <Input
                        id="firstName"
                        type="text"
                        value={formData.firstName}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            firstName: e.target.value,
                          })
                        }
                        placeholder="Type your answer here..."
                        className="pl-12 bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 h-12 text-base rounded-xl"
                      />
                    </div>
                    {errors.firstName && (
                      <p className="text-red-400 text-sm">{errors.firstName}</p>
                    )}
                  </div>

                  {/* Last Name */}
                  <div className="space-y-1">
                    <label
                      htmlFor="lastName"
                      className="block text-sm font-medium text-zinc-300"
                    >
                      Last name <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                      <Input
                        id="lastName"
                        type="text"
                        value={formData.lastName}
                        onChange={(e) =>
                          setFormData({ ...formData, lastName: e.target.value })
                        }
                        placeholder="Type your answer here..."
                        className="pl-12 bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 h-12 text-base rounded-xl"
                      />
                    </div>
                    {errors.lastName && (
                      <p className="text-red-400 text-sm">{errors.lastName}</p>
                    )}
                  </div>

                  {/* Email */}
                  <div className="space-y-1">
                    <label
                      htmlFor="email"
                      className="block text-sm font-medium text-zinc-300"
                    >
                      Email <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) =>
                          setFormData({ ...formData, email: e.target.value })
                        }
                        placeholder="Type your answer here..."
                        className="pl-12 bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 h-12 text-base rounded-xl"
                        autoComplete="email"
                      />
                    </div>
                    {errors.email && (
                      <p className="text-red-400 text-sm">{errors.email}</p>
                    )}
                  </div>

                  {/* Phone */}
                  <div className="space-y-1">
                    <label
                      htmlFor="phone"
                      className="block text-sm font-medium text-zinc-300"
                    >
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
                        onChange={(e) =>
                          setFormData({ ...formData, phone: e.target.value })
                        }
                        placeholder="(555) 123-4567"
                        className="rounded-l-none bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 h-12 text-base rounded-r-xl"
                      />
                    </div>
                    {errors.phone && (
                      <p className="text-red-400 text-sm">{errors.phone}</p>
                    )}
                  </div>

                  {/* SMS Consent */}
                  <div className="flex items-start space-x-3 pt-2">
                    <Checkbox
                      id="smsConsent"
                      checked={smsConsent}
                      onCheckedChange={(checked) =>
                        setSmsConsent(checked === true)
                      }
                      className="mt-1 border-zinc-600 data-[state=checked]:bg-white data-[state=checked]:text-black"
                    />
                    <label
                      htmlFor="smsConsent"
                      className="text-xs text-zinc-400 leading-relaxed cursor-pointer"
                    >
                      By providing a telephone number, clicking this button, and
                      submitting this form, you consent to receive SMS text
                      messages from Nextier regarding new offers and marketing.
                      Message frequency varies. Message & data rates may apply.
                      Reply STOP to unsubscribe. Reply HELP for more
                      information. Nextier is a consultant, advisor, and owner
                      of Nextier Technologies. When you consent to receive
                      messaging from Nextier, you are providing consent only to
                      Nextier, not any third parties.{" "}
                      <strong className="text-zinc-300">
                        Your SMS opt-in data will never be shared or sold to
                        third parties.
                      </strong>{" "}
                      See our{" "}
                      <Link
                        href="/privacy"
                        className="text-zinc-300 underline hover:no-underline"
                      >
                        Privacy Policy
                      </Link>{" "}
                      (containing our SMS Terms) for more information.
                    </label>
                  </div>
                  {errors.smsConsent && (
                    <p className="text-red-400 text-sm ml-6">
                      {errors.smsConsent}
                    </p>
                  )}

                  {errors.submit && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
                      <p className="text-red-400 text-sm">{errors.submit}</p>
                    </div>
                  )}

                  <Button
                    type="submit"
                    disabled={loading || !smsConsent}
                    className="w-full h-14 bg-white text-black hover:bg-zinc-200 font-semibold text-lg rounded-xl disabled:opacity-50"
                  >
                    {loading ? "Submitting..." : "Submit"}
                  </Button>

                  <p className="text-center text-zinc-600 text-xs">
                    <Link href="/terms" className="hover:text-zinc-400">
                      Terms of Service
                    </Link>
                    {" | "}
                    <Link href="/privacy" className="hover:text-zinc-400">
                      Privacy Policy
                    </Link>
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

        {/* Deep Dive Sections */}
        <div className="mt-16 grid lg:grid-cols-3 gap-6">
          {DEEP_DIVE.map((group) => (
            <div
              key={group.title}
              className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 shadow-lg"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/30 to-purple-500/30 flex items-center justify-center">
                  <group.icon className="w-5 h-5 text-blue-200" />
                </div>
                <h4 className="text-lg font-semibold text-white">
                  {group.title}
                </h4>
              </div>
              <ul className="space-y-3 text-zinc-400 text-sm">
                {group.points.map((point) => (
                  <li key={point} className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-emerald-400 mt-0.5" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* How It Works */}
        <div className="mt-20 mb-24">
          <h3 className="text-center text-2xl font-bold text-white mb-4">
            How It Works
          </h3>
          <p className="text-center text-zinc-500 mb-10 max-w-2xl mx-auto">
            Three moves to get from audience mapping to revenue outcomes without
            coupling execution.
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            {STEPS.map((step, idx) => (
              <div
                key={step.title}
                className="relative bg-zinc-900/70 border border-zinc-800 rounded-2xl p-6"
              >
                <div className="absolute -top-3 -left-3 w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold">
                  {idx + 1}
                </div>
                <h4 className="text-lg font-semibold text-white mb-2">
                  {step.title}
                </h4>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
