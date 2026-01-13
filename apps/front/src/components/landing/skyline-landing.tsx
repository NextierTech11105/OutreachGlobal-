"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Mail,
  Calendar,
  MessageSquare,
  Bot,
  PhoneCall,
  Handshake,
  ArrowRight,
  ChevronDown,
} from "lucide-react";

/**
 * SKYLINE LANDING PAGE
 * ═══════════════════════════════════════════════════════════════════════════════
 * Full-bleed NYC skyline background with NEXTIER blimp
 * Clean, premium feel - content overlaid on the stunning visual
 *
 * "Rising above the noise"
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// The execution loop stages - shown as floating cards
const EXECUTION_STAGES = [
  {
    name: "SMS Foundation",
    description: "10DLC compliant outreach at scale",
    icon: MessageSquare,
  },
  {
    name: "AI Copilots",
    description: "GIANNA, CATHY, SABRINA orchestrating every touch",
    icon: Bot,
  },
  {
    name: "Hot Call Queue",
    description: "Qualified leads, ready to convert",
    icon: PhoneCall,
  },
  {
    name: "Deals Closed",
    description: "Predictable, repeatable revenue",
    icon: Handshake,
  },
];

export function SkylineLanding() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Full-screen background image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url('/nextier-skyline.jpg')`,
        }}
      >
        {/* Gradient overlay for text readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/70" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-transparent to-black/30" />
      </div>

      {/* Content */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Navigation */}
        <nav className="flex items-center justify-between px-6 md:px-12 py-6">
          <div className="text-2xl font-bold text-white tracking-tight">
            NEXTIER
          </div>
          <div className="hidden md:flex items-center gap-8 text-white/80">
            <a href="#platform" className="hover:text-white transition">
              Platform
            </a>
            <a href="#execution" className="hover:text-white transition">
              Execution Loop
            </a>
            <a href="#partners" className="hover:text-white transition">
              Partners
            </a>
          </div>
          <Button
            variant="outline"
            className="border-white/30 text-white hover:bg-white/10 backdrop-blur-sm"
            asChild
          >
            <a href="mailto:tb@outreachglobal.io">Contact</a>
          </Button>
        </nav>

        {/* Hero Section */}
        <section className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.2 }}
          >
            <Badge className="mb-6 bg-white/10 text-white border-white/20 backdrop-blur-sm px-4 py-2">
              Revenue Execution Engine
            </Badge>

            <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold text-white mb-6 tracking-tight">
              Rise Above
              <br />
              <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
                The Noise
              </span>
            </h1>

            <p className="text-xl md:text-2xl text-white/80 max-w-2xl mx-auto mb-10 leading-relaxed">
              Relentless lead generation. AI-powered execution.
              <br className="hidden md:block" />
              From first touch to closed deal.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                className="bg-white text-slate-900 hover:bg-white/90 px-8 py-6 text-lg font-semibold"
                asChild
              >
                <a href="mailto:tb@outreachglobal.io?subject=NEXTIER%20Partnership%20Inquiry">
                  <Mail className="mr-2 w-5 h-5" />
                  Partner With Us
                </a>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-white/30 text-white hover:bg-white/10 backdrop-blur-sm px-8 py-6 text-lg"
                asChild
              >
                <a href="mailto:tb@outreachglobal.io?subject=15-Min%20Discovery%20Call">
                  <Calendar className="mr-2 w-5 h-5" />
                  Book 15-Min Call
                </a>
              </Button>
            </div>
          </motion.div>

          {/* Scroll indicator */}
          <motion.div
            className="absolute bottom-10"
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <ChevronDown className="w-8 h-8 text-white/50" />
          </motion.div>
        </section>

        {/* Execution Loop Cards - floating at bottom */}
        <section id="execution" className="px-6 md:px-12 pb-20">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="max-w-6xl mx-auto"
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {EXECUTION_STAGES.map((stage, index) => {
                const Icon = stage.icon;
                return (
                  <motion.div
                    key={stage.name}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    className="group"
                  >
                    <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 hover:bg-white/15 transition-all hover:scale-105">
                      <Icon className="w-8 h-8 text-cyan-400 mb-3" />
                      <h3 className="text-white font-semibold text-lg mb-1">
                        {stage.name}
                      </h3>
                      <p className="text-white/60 text-sm">
                        {stage.description}
                      </p>
                    </div>
                    {index < EXECUTION_STAGES.length - 1 && (
                      <div className="hidden md:flex justify-end -mr-4 mt-4">
                        <ArrowRight className="w-5 h-5 text-white/30" />
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        </section>
      </div>

      {/* Second Section - Platform Details */}
      <section id="platform" className="relative bg-slate-950 py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Your CRM. <span className="text-cyan-400">Supercharged.</span>
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              We don't replace your CRM. We make it relentless. Zoho,
              Salesforce, HubSpot, GoHighLevel — all connected.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="bg-white/5 border border-white/10 rounded-2xl p-8"
            >
              <div className="text-5xl font-bold text-cyan-400 mb-2">
                2,000+
              </div>
              <div className="text-white text-lg font-medium mb-2">
                SMS per Day
              </div>
              <div className="text-gray-500">
                10DLC compliant via SignalHouse. No carrier blocks.
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="bg-white/5 border border-white/10 rounded-2xl p-8"
            >
              <div className="text-5xl font-bold text-cyan-400 mb-2">3</div>
              <div className="text-white text-lg font-medium mb-2">
                AI Workers
              </div>
              <div className="text-gray-500">
                GIANNA opens. CATHY nurtures. SABRINA closes.
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="bg-white/5 border border-white/10 rounded-2xl p-8"
            >
              <div className="text-5xl font-bold text-cyan-400 mb-2">7+</div>
              <div className="text-white text-lg font-medium mb-2">
                CRM Integrations
              </div>
              <div className="text-gray-500">
                Deep sync with all major CRMs. Real-time activity logging.
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Partnership CTA */}
      <section
        id="partners"
        className="relative bg-gradient-to-b from-slate-950 to-slate-900 py-24 px-6"
      >
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
          >
            <Mail className="w-16 h-16 mx-auto mb-8 text-cyan-400" />
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              White Label Partnerships
            </h2>
            <p className="text-xl text-gray-400 mb-4">
              For CRM Consultants Who Get It
            </p>
            <p className="text-gray-500 max-w-2xl mx-auto mb-10">
              We're building the future of revenue execution. Email us for a
              15-minute discovery call with our founder. We'll qualify the fit,
              or redirect you to the right resources.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                className="bg-cyan-500 hover:bg-cyan-400 text-white px-10 py-6 text-lg"
                asChild
              >
                <a href="mailto:tb@outreachglobal.io?subject=NEXTIER%20White%20Label%20Partnership&body=Hi%20Tommy%2C%0A%0AI'm%20interested%20in%20discussing%20white%20label%20partnership%20opportunities.%0A%0A">
                  <Mail className="mr-2 w-5 h-5" />
                  Email Us to Discuss
                </a>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-white/20 text-white hover:bg-white/5 px-10 py-6 text-lg"
                asChild
              >
                <a href="mailto:tb@outreachglobal.io?subject=15-Min%20Discovery%20Call%20-%20Partnership">
                  <Calendar className="mr-2 w-5 h-5" />
                  15-Min Discovery
                </a>
              </Button>
            </div>

            <p className="text-sm text-gray-600 mt-8">
              tb@outreachglobal.io — Founder Direct
            </p>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-950 border-t border-white/5 py-12 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="text-2xl font-bold text-white">NEXTIER</div>
          <p className="text-gray-500 text-sm text-center">
            Rising above the noise. Turning data into deals.
          </p>
          <div className="text-gray-600 text-sm">
            © {new Date().getFullYear()} OutreachGlobal
          </div>
        </div>
      </footer>
    </div>
  );
}

export default SkylineLanding;
