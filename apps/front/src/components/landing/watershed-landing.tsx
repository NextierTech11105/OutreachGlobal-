"use client";

import { useEffect, useState, useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Database,
  CheckSquare,
  MessageSquare,
  Inbox,
  Bot,
  PhoneCall,
  Clock,
  Users,
  FileText,
  Handshake,
  Droplets,
  ChevronDown,
  ArrowRight,
  Zap,
  Mail,
  Calendar,
} from "lucide-react";

/**
 * WATERSHED LANDING PAGE
 * ═══════════════════════════════════════════════════════════════════════════════
 * "Water always finds its way"
 *
 * Visualizes the NEXTIER execution loop as water carving its inevitable path
 * down a watershed. No matter how hard the rock, water carves through.
 *
 * DATA PREP → CAMPAIGN PREP → OUTBOUND SMS → INBOUND RESPONSE →
 * AI COPILOT → HOT CALL QUEUE → 15-MIN DISCOVERY → 1-HOUR STRATEGY →
 * PROPOSAL → DEAL
 *
 * Each stage is a natural pool where water gathers momentum before
 * cascading to the next level.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

const WATERSHED_STAGES = [
  {
    id: "data-prep",
    name: "DATA PREP",
    tagline: "The source springs forth",
    description:
      "Like mountain snowmelt, raw data pools and purifies before beginning its journey.",
    icon: Database,
    color: "from-cyan-400 to-blue-500",
    bgColor: "bg-cyan-950/30",
  },
  {
    id: "campaign-prep",
    name: "CAMPAIGN PREP",
    tagline: "Channels form naturally",
    description:
      "Water finds the path of least resistance. Your campaigns align with natural buyer intent.",
    icon: CheckSquare,
    color: "from-blue-400 to-indigo-500",
    bgColor: "bg-blue-950/30",
  },
  {
    id: "outbound-sms",
    name: "OUTBOUND SMS",
    tagline: "The first cascade",
    description:
      "10DLC compliant messages flow out at scale. GIANNA opens every conversation.",
    icon: MessageSquare,
    color: "from-indigo-400 to-purple-500",
    bgColor: "bg-indigo-950/30",
  },
  {
    id: "inbound-response",
    name: "INBOUND RESPONSE",
    tagline: "Tributaries return",
    description:
      "Responses flow back, joining the main current. Every reply adds momentum.",
    icon: Inbox,
    color: "from-purple-400 to-pink-500",
    bgColor: "bg-purple-950/30",
  },
  {
    id: "ai-copilot",
    name: "AI COPILOT",
    tagline: "The sorting rapids",
    description:
      "AI classifies, labels, prioritizes. Hot leads surface. Cold leads nurture downstream.",
    icon: Bot,
    color: "from-emerald-400 to-teal-500",
    bgColor: "bg-emerald-950/30",
    highlight: true,
  },
  {
    id: "hot-call-queue",
    name: "HOT CALL QUEUE",
    tagline: "The gathering pool",
    description:
      "Qualified prospects collect here. SABRINA warms them for the call.",
    icon: PhoneCall,
    color: "from-green-400 to-emerald-500",
    bgColor: "bg-green-950/30",
  },
  {
    id: "discovery",
    name: "15-MIN DISCOVERY",
    tagline: "First contact depth",
    description:
      "Like water testing rock, you probe for fit. Authority established in minutes.",
    icon: Clock,
    color: "from-teal-400 to-cyan-500",
    bgColor: "bg-teal-950/30",
  },
  {
    id: "strategy",
    name: "1-HOUR STRATEGY",
    tagline: "The deep channel",
    description:
      "Serious conversations cut deep grooves. Trust compounds with every interaction.",
    icon: Users,
    color: "from-blue-400 to-sky-500",
    bgColor: "bg-blue-950/30",
  },
  {
    id: "proposal",
    name: "PROPOSAL",
    tagline: "The falls approach",
    description:
      "Momentum builds. The deal takes shape. There's only one direction now.",
    icon: FileText,
    color: "from-sky-400 to-blue-500",
    bgColor: "bg-sky-950/30",
  },
  {
    id: "deal",
    name: "DEAL",
    tagline: "The ocean awaits",
    description:
      "Every drop reaches the sea. Every lead finds its destination. Inevitable.",
    icon: Handshake,
    color: "from-blue-500 to-indigo-600",
    bgColor: "bg-blue-950/40",
    highlight: true,
  },
];

// Water droplet animation component
function WaterDroplet({ delay = 0 }: { delay?: number }) {
  return (
    <motion.div
      className="absolute w-2 h-2 rounded-full bg-cyan-400/60 blur-[1px]"
      initial={{ y: -20, x: 0, opacity: 0 }}
      animate={{
        y: [0, 100, 200],
        x: [0, Math.random() * 20 - 10, Math.random() * 40 - 20],
        opacity: [0, 0.8, 0],
      }}
      transition={{
        duration: 3,
        delay,
        repeat: Infinity,
        ease: "easeIn",
      }}
    />
  );
}

// Flowing water stream SVG
function WaterStream({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`absolute w-full h-32 ${className}`}
      viewBox="0 0 200 100"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id="waterGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="rgba(34, 211, 238, 0.3)" />
          <stop offset="50%" stopColor="rgba(59, 130, 246, 0.4)" />
          <stop offset="100%" stopColor="rgba(99, 102, 241, 0.3)" />
        </linearGradient>
        <filter id="waterBlur">
          <feGaussianBlur stdDeviation="2" />
        </filter>
      </defs>
      <motion.path
        d="M 100 0 Q 80 25 100 50 Q 120 75 100 100"
        fill="none"
        stroke="url(#waterGradient)"
        strokeWidth="40"
        filter="url(#waterBlur)"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 2, ease: "easeOut" }}
      />
    </svg>
  );
}

// Stage card component
function StageCard({
  stage,
  index,
}: {
  stage: (typeof WATERSHED_STAGES)[0];
  index: number;
}) {
  const Icon = stage.icon;
  const isLeft = index % 2 === 0;

  return (
    <motion.div
      className={`relative flex ${isLeft ? "justify-start" : "justify-end"} w-full`}
      initial={{ opacity: 0, x: isLeft ? -100 : 100 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.8, delay: index * 0.1 }}
    >
      {/* Connection line to center */}
      <div
        className={`absolute top-1/2 ${isLeft ? "right-1/2" : "left-1/2"} w-1/4 h-px bg-gradient-to-r ${isLeft ? "from-transparent to-cyan-500/50" : "from-cyan-500/50 to-transparent"}`}
      />

      {/* Card */}
      <div
        className={`relative w-[45%] ${stage.bgColor} backdrop-blur-sm border border-white/10 rounded-2xl p-6 ${stage.highlight ? "ring-2 ring-cyan-500/50" : ""}`}
      >
        {/* Glow effect */}
        <div
          className={`absolute inset-0 bg-gradient-to-br ${stage.color} opacity-10 rounded-2xl blur-xl`}
        />

        <div className="relative z-10">
          {/* Header */}
          <div className="flex items-center gap-3 mb-3">
            <div className={`p-2 rounded-lg bg-gradient-to-br ${stage.color}`}>
              <Icon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-white text-lg">{stage.name}</h3>
              <p className="text-cyan-300 text-sm italic">{stage.tagline}</p>
            </div>
          </div>

          {/* Description */}
          <p className="text-gray-300 text-sm leading-relaxed">
            {stage.description}
          </p>

          {/* Stage number badge */}
          <Badge
            variant="outline"
            className="absolute -top-3 -right-3 bg-slate-900 border-cyan-500/50 text-cyan-400"
          >
            {String(index + 1).padStart(2, "0")}
          </Badge>
        </div>
      </div>
    </motion.div>
  );
}

export function WatershedLanding() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  // Water level rises as you scroll
  const waterLevel = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);

  return (
    <div
      ref={containerRef}
      className="relative min-h-[500vh] bg-gradient-to-b from-slate-950 via-slate-900 to-blue-950"
    >
      {/* Fixed background with water effect */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {/* Stars/particles */}
        {Array.from({ length: 50 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-white/30 rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              opacity: [0.2, 0.8, 0.2],
            }}
            transition={{
              duration: 2 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}

        {/* Central water stream */}
        <div className="absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2">
          <motion.div
            className="absolute inset-0 w-2 -translate-x-1/2 bg-gradient-to-b from-cyan-500/0 via-cyan-500/30 to-blue-600/50"
            style={{ height: waterLevel }}
          />
        </div>
      </div>

      {/* Hero Section */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-4 text-center">
        {/* Floating droplets */}
        <div className="absolute inset-0 overflow-hidden">
          {Array.from({ length: 20 }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute"
              style={{
                left: `${30 + Math.random() * 40}%`,
                top: `${Math.random() * 100}%`,
              }}
            >
              <WaterDroplet delay={i * 0.3} />
            </motion.div>
          ))}
        </div>

        {/* Content */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
          className="relative z-10"
        >
          <Badge className="mb-6 bg-cyan-500/20 text-cyan-300 border-cyan-500/30">
            <Droplets className="w-3 h-3 mr-1" />
            Revenue Execution Engine
          </Badge>

          <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-b from-white via-cyan-200 to-blue-400 bg-clip-text text-transparent">
            Water Always
            <br />
            Finds Its Way
          </h1>

          <p className="text-xl md:text-2xl text-gray-400 max-w-2xl mx-auto mb-8">
            Like water carving through rock, NEXTIER's execution chain
            <span className="text-cyan-400 font-semibold">
              {" "}
              inevitably flows from data to deals
            </span>
            . No matter how hard the obstacle.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white px-8"
              asChild
            >
              <a href="mailto:tb@outreachglobal.io?subject=NEXTIER%20Partnership%20Inquiry">
                <Mail className="mr-2 w-4 h-4" />
                Email Us to Partner
              </a>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10"
              onClick={() =>
                document
                  .getElementById("watershed-stages")
                  ?.scrollIntoView({ behavior: "smooth" })
              }
            >
              See the Flow
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-10 left-1/2 -translate-x-1/2"
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <ChevronDown className="w-8 h-8 text-cyan-500/50" />
        </motion.div>
      </section>

      {/* Tagline Section */}
      <section className="relative py-20 px-4">
        <motion.div
          className="max-w-4xl mx-auto text-center"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            The{" "}
            <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
              Relentless
            </span>{" "}
            Path
          </h2>
          <p className="text-lg text-gray-400 leading-relaxed">
            Water doesn't ask permission. It doesn't wait for the perfect
            conditions. It simply <span className="text-cyan-400">flows</span>
            —finding cracks, building pressure, carving channels that grow
            deeper with every passing moment. Your revenue engine should work
            the same way.
          </p>
        </motion.div>
      </section>

      {/* Watershed Stages */}
      <section id="watershed-stages" className="relative py-20 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Central stream line */}
          <div className="absolute left-1/2 top-0 bottom-0 w-1 -translate-x-1/2">
            <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/20 via-blue-500/30 to-indigo-500/20" />
            {/* Animated water flow */}
            <motion.div
              className="absolute left-0 right-0 h-20 bg-gradient-to-b from-cyan-400/50 to-transparent"
              animate={{ y: ["-100%", "500%"] }}
              transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
            />
          </div>

          {/* Stage cards */}
          <div className="relative space-y-16">
            {WATERSHED_STAGES.map((stage, index) => (
              <StageCard key={stage.id} stage={stage} index={index} />
            ))}
          </div>
        </div>
      </section>

      {/* Philosophy Section */}
      <section className="relative py-32 px-4">
        <motion.div
          className="max-w-4xl mx-auto text-center"
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <Zap className="w-16 h-16 mx-auto mb-8 text-cyan-400" />
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-8">
            Compound Every Touch
          </h2>
          <p className="text-xl text-gray-400 mb-12 leading-relaxed">
            A single drop means nothing. But water doesn't send single drops. It
            sends{" "}
            <span className="text-cyan-400 font-semibold">
              relentless streams
            </span>{" "}
            that compound into rivers, that compound into{" "}
            <span className="text-cyan-400 font-semibold">
              unstoppable forces
            </span>
            .
          </p>

          <div className="grid md:grid-cols-3 gap-8 text-left">
            <div className="p-6 rounded-xl bg-white/5 border border-white/10">
              <div className="text-4xl font-bold text-cyan-400 mb-2">
                2,000+
              </div>
              <div className="text-gray-400">SMS per day capacity</div>
              <div className="text-sm text-gray-500 mt-1">
                10DLC compliant via SignalHouse
              </div>
            </div>
            <div className="p-6 rounded-xl bg-white/5 border border-white/10">
              <div className="text-4xl font-bold text-cyan-400 mb-2">3</div>
              <div className="text-gray-400">AI Workers</div>
              <div className="text-sm text-gray-500 mt-1">
                GIANNA, CATHY, SABRINA
              </div>
            </div>
            <div className="p-6 rounded-xl bg-white/5 border border-white/10">
              <div className="text-4xl font-bold text-cyan-400 mb-2">7+</div>
              <div className="text-gray-400">CRM Integrations</div>
              <div className="text-sm text-gray-500 mt-1">
                More than SignalHouse marketplace
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* CTA Section */}
      <section className="relative py-32 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="p-12 rounded-3xl bg-gradient-to-br from-cyan-950/50 to-blue-950/50 border border-cyan-500/20"
          >
            <Mail className="w-12 h-12 mx-auto mb-6 text-cyan-400" />
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Let's Discuss Our Vision
            </h2>
            <p className="text-xl text-gray-300 mb-4">
              White Label Partnerships with CRM Consultants
            </p>
            <p className="text-gray-400 mb-8 max-w-2xl mx-auto">
              We're building the future of revenue execution—and we want CRM
              consultants who understand the landscape to be part of it. Email
              us to schedule a 15-minute discovery call with our founder. We'll
              qualify the fit together, or redirect you to the right resources.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white px-10 py-6 text-lg"
                asChild
              >
                <a href="mailto:tb@outreachglobal.io?subject=NEXTIER%20White%20Label%20Partnership%20Inquiry&body=Hi%20Tommy%2C%0A%0AI'm%20interested%20in%20discussing%20white%20label%20partnership%20opportunities%20with%20NEXTIER.%0A%0A">
                  <Mail className="mr-2 w-5 h-5" />
                  Email Us to Discuss
                </a>
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10 px-10 py-6 text-lg"
                asChild
              >
                <a href="mailto:tb@outreachglobal.io?subject=15-Min%20Discovery%20Call%20-%20NEXTIER%20Partnership&body=Hi%20Tommy%2C%0A%0AI'd%20like%20to%20book%20a%2015-minute%20discovery%20call%20to%20discuss%20NEXTIER%20partnership%20opportunities.%0A%0AMy%20background%3A%0A%0A">
                  <Calendar className="mr-2 w-5 h-5" />
                  15-Min Discovery Call
                </a>
              </Button>
            </div>
            <p className="text-sm text-gray-500 mt-6">
              tb@outreachglobal.io • Founder Direct Line
            </p>
          </motion.div>
        </div>
      </section>

      {/* Footer quote */}
      <section className="relative py-20 px-4 border-t border-white/5">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-2xl text-gray-500 italic">
            "In the confrontation between the stream and the rock, the stream
            always wins—not through strength, but through persistence."
          </p>
          <p className="text-cyan-500 mt-4">— The NEXTIER Philosophy</p>
        </div>
      </section>
    </div>
  );
}

export default WatershedLanding;
