"use client";

import { useState } from "react";
import Link from "next/link";
import { Calendar, ArrowRight, Check, Phone, MessageSquare, Target, Zap } from "lucide-react";

// Your Calendly link - update this
const CALENDLY_LINK = "https://calendly.com/nextier/discovery";

const audiences = [
  {
    category: "B2B Sales Leaders",
    icon: "💼",
    roles: [
      { title: "VP of Sales", pain: "Pipeline isn't predictable" },
      { title: "Sales Directors", pain: "Reps spending too much time prospecting" },
      { title: "CROs", pain: "Need more at-bats for closers" },
      { title: "BDR/SDR Managers", pain: "Team can't scale fast enough" },
    ],
  },
  {
    category: "Agency Owners",
    icon: "🎯",
    roles: [
      { title: "Marketing Agency Owners", pain: "Client acquisition is feast or famine" },
      { title: "Digital Agency Founders", pain: "CAC keeps climbing" },
      { title: "Creative Directors", pain: "No time for new business development" },
    ],
  },
  {
    category: "Tech Founders",
    icon: "🚀",
    roles: [
      { title: "SaaS CEOs", pain: "Outbound is a full-time job" },
      { title: "Startup Founders", pain: "Can't afford a sales team yet" },
      { title: "CTOs turned CEOs", pain: "Sales isn't your zone of genius" },
    ],
  },
  {
    category: "Real Estate Pros",
    icon: "🏠",
    roles: [
      { title: "Real Estate Agents", pain: "Listings are hard to come by" },
      { title: "Real Estate Investors", pain: "Off-market deals are competitive" },
      { title: "Property Managers", pain: "Owner acquisition is slow" },
      { title: "Brokers", pain: "Agents need more opportunities" },
    ],
  },
  {
    category: "Home Services Owners",
    icon: "🔧",
    roles: [
      { title: "Roofing Contractors", pain: "Storm chasing is exhausting" },
      { title: "HVAC Company Owners", pain: "Seasonality kills cash flow" },
      { title: "Solar Installers", pain: "Lead quality is trash" },
      { title: "Kitchen Remodelers", pain: "High-ticket sales cycle is brutal" },
      { title: "Plumbers", pain: "Emergency calls aren't consistent" },
      { title: "Window Replacement", pain: "Tire kickers waste your time" },
      { title: "Bathroom Remodelers", pain: "Leads ghost after the quote" },
      { title: "Flooring Installers", pain: "Competition undercuts on price" },
      { title: "Painters", pain: "Scope creep kills margins" },
      { title: "Landscapers", pain: "Recurring contracts are hard to land" },
      { title: "Deck Builders", pain: "Permits slow everything down" },
      { title: "Pest Control", pain: "One-time jobs don't build wealth" },
      { title: "Garage Door Companies", pain: "Lead gen is expensive" },
      { title: "Fence Installers", pain: "Neighbors don't refer like they used to" },
    ],
  },
  {
    category: "Trucking & Logistics",
    icon: "🚛",
    roles: [
      { title: "Fleet Owners", pain: "Driver recruitment is a nightmare" },
      { title: "Freight Brokers", pain: "Carrier relationships take forever" },
      { title: "Logistics Companies", pain: "New lanes are hard to win" },
    ],
  },
];

export default function ClosersLandingPage() {
  const [selectedAudience, setSelectedAudience] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-orange-600/20 via-black to-black" />

        <div className="relative max-w-6xl mx-auto px-6 py-24 lg:py-32">
          <div className="text-center space-y-8">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-400 text-sm font-medium">
              <Zap className="w-4 h-4" />
              For Closers Only
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold leading-tight">
              We Manufacture{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-600">
                Inbound Responses
              </span>
            </h1>

            {/* Subheadline */}
            <p className="text-xl md:text-2xl text-zinc-400 max-w-3xl mx-auto">
              For closers who have the{" "}
              <span className="text-white font-semibold">confidence</span> and{" "}
              <span className="text-white font-semibold">competence</span> to convert into deals.
            </p>

            {/* Value Props */}
            <div className="flex flex-wrap justify-center gap-6 text-sm text-zinc-400 pt-4">
              <div className="flex items-center gap-2">
                <Check className="w-5 h-5 text-orange-500" />
                <span>You close. We fill the pipeline.</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-5 h-5 text-orange-500" />
                <span>Warm leads. Not cold lists.</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-5 h-5 text-orange-500" />
                <span>People who actually respond.</span>
              </div>
            </div>

            {/* Integration Message */}
            <div className="pt-6 pb-2">
              <p className="text-lg text-zinc-300 font-medium">
                We compete with nothing. We integrate with everything.
              </p>
              <p className="text-zinc-500 mt-2">
                No need to switch CRMs. Works with your existing tools.
              </p>
            </div>

            {/* White Label Partnership */}
            <div className="pt-4">
              <a
                href={CALENDLY_LINK}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-orange-400 hover:text-orange-300 font-medium transition-colors"
              >
                Learn about our White Label Partnership
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>

            {/* CTA */}
            <div className="pt-8">
              <a
                href={CALENDLY_LINK}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-3 px-8 py-4 bg-orange-500 hover:bg-orange-600 text-black font-bold text-lg rounded-lg transition-all hover:scale-105 shadow-lg shadow-orange-500/25"
              >
                <Calendar className="w-5 h-5" />
                Book Your Discovery Call
                <ArrowRight className="w-5 h-5" />
              </a>
              <p className="text-zinc-500 text-sm mt-4">15 minutes. No pitch. Just clarity.</p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 border-t border-zinc-800">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">
            The Machine Behind Your Pipeline
          </h2>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center space-y-4 p-6">
              <div className="w-16 h-16 bg-orange-500/10 rounded-2xl flex items-center justify-center mx-auto">
                <Target className="w-8 h-8 text-orange-500" />
              </div>
              <h3 className="text-xl font-bold">1. We Find Them</h3>
              <p className="text-zinc-400">
                Millions of verified contacts. Skip-traced. Enriched. Ready for outreach.
              </p>
            </div>

            <div className="text-center space-y-4 p-6">
              <div className="w-16 h-16 bg-orange-500/10 rounded-2xl flex items-center justify-center mx-auto">
                <MessageSquare className="w-8 h-8 text-orange-500" />
              </div>
              <h3 className="text-xl font-bold">2. We Engage Them</h3>
              <p className="text-zinc-400">
                AI-powered SMS sequences. 5 touches. Until they respond or say stop.
              </p>
            </div>

            <div className="text-center space-y-4 p-6">
              <div className="w-16 h-16 bg-orange-500/10 rounded-2xl flex items-center justify-center mx-auto">
                <Phone className="w-8 h-8 text-orange-500" />
              </div>
              <h3 className="text-xl font-bold">3. You Close Them</h3>
              <p className="text-zinc-400">
                Warm responses hit your queue. You pick up the phone. You do what you do best.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Audiences Section */}
      <section className="py-20 bg-zinc-900/50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Built For Closers In Every Industry
            </h2>
            <p className="text-zinc-400 text-lg">
              Find your lane. We&apos;ll fill your calendar.
            </p>
          </div>

          <div className="space-y-8">
            {audiences.map((audience) => (
              <div
                key={audience.category}
                className="bg-zinc-800/50 rounded-2xl border border-zinc-700/50 overflow-hidden"
              >
                {/* Category Header */}
                <button
                  type="button"
                  onClick={() =>
                    setSelectedAudience(
                      selectedAudience === audience.category ? null : audience.category
                    )
                  }
                  className="w-full px-6 py-5 flex items-center justify-between hover:bg-zinc-700/30 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-3xl">{audience.icon}</span>
                    <span className="text-xl font-bold">{audience.category}</span>
                    <span className="text-zinc-500 text-sm">
                      ({audience.roles.length} roles)
                    </span>
                  </div>
                  <ArrowRight
                    className={`w-5 h-5 text-zinc-400 transition-transform ${
                      selectedAudience === audience.category ? "rotate-90" : ""
                    }`}
                  />
                </button>

                {/* Expanded Roles */}
                {selectedAudience === audience.category && (
                  <div className="px-6 pb-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {audience.roles.map((role) => (
                      <div
                        key={role.title}
                        className="bg-zinc-900/50 rounded-lg p-4 border border-zinc-700/30"
                      >
                        <h4 className="font-semibold text-white mb-1">{role.title}</h4>
                        <p className="text-sm text-zinc-500">&quot;{role.pain}&quot;</p>
                      </div>
                    ))}

                    {/* CTA inside expanded section */}
                    <a
                      href={CALENDLY_LINK}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4 flex items-center justify-center gap-2 text-orange-400 font-semibold hover:bg-orange-500/20 transition-colors"
                    >
                      <Calendar className="w-4 h-4" />
                      Book Call for {audience.category}
                    </a>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* The Truth Section */}
      <section className="py-20 border-t border-zinc-800">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-8">
            Here&apos;s The Truth
          </h2>
          <div className="space-y-6 text-lg text-zinc-400">
            <p>
              You&apos;re good at closing. Really good.
            </p>
            <p>
              But you&apos;re spending half your time chasing people who won&apos;t pick up.
            </p>
            <p>
              What if you only talked to people who{" "}
              <span className="text-white font-semibold">already raised their hand?</span>
            </p>
            <p className="text-white text-xl font-semibold pt-4">
              That&apos;s what we build for you.
            </p>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 bg-gradient-to-t from-orange-600/10 to-transparent">
        <div className="max-w-4xl mx-auto px-6 text-center space-y-8">
          <h2 className="text-4xl md:text-5xl font-bold">
            Ready to Stop Chasing?
          </h2>
          <p className="text-xl text-zinc-400">
            15 minutes. We&apos;ll show you exactly how the machine works for your industry.
          </p>
          <a
            href={CALENDLY_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 px-10 py-5 bg-orange-500 hover:bg-orange-600 text-black font-bold text-xl rounded-lg transition-all hover:scale-105 shadow-lg shadow-orange-500/25"
          >
            <Calendar className="w-6 h-6" />
            Book Your Discovery Call Now
            <ArrowRight className="w-6 h-6" />
          </a>
          <p className="text-zinc-600 text-sm">
            No pitch. No pressure. Just a conversation about your pipeline.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t border-zinc-800">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-zinc-500 text-sm">
            &copy; {new Date().getFullYear()} Nextier. Manufacturing responses for closers.
          </div>
          <div className="flex items-center gap-6 text-zinc-500 text-sm">
            <Link href="/privacy" className="hover:text-white transition-colors">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-white transition-colors">
              Terms
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
