"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Mail,
  Calendar,
  Phone,
  ExternalLink,
  MessageSquare,
  Bot,
  PhoneCall,
  Handshake,
  CheckCircle,
  Star,
  ArrowRight,
  ChevronDown,
} from "lucide-react";

/**
 * LANDING PAGE RENDERER
 * ═══════════════════════════════════════════════════════════════════════════════
 * Renders dynamic landing pages from configuration
 *
 * PSYCHOLOGY PRINCIPLES APPLIED:
 * - ATTENTION: Strong visual hierarchy, contrast, motion
 * - RECIPROCITY: Offer value before asking
 * - SOCIAL PROOF: Testimonials, stats, logos
 * - SCARCITY/URGENCY: Limited time, spots, availability
 * - AUTHORITY: Credentials, expertise, trust signals
 * - COMMITMENT: Small asks leading to big asks
 *
 * MENTAL MAPPING:
 * Visitor enters with a question → We answer it → They want more → CTA
 * ═══════════════════════════════════════════════════════════════════════════════
 */

interface LandingPageSection {
  id: string;
  type:
    | "hero"
    | "features"
    | "stats"
    | "testimonials"
    | "cta"
    | "faq"
    | "custom";
  content: Record<string, unknown>;
  order: number;
}

interface LandingPageConfig {
  id: string;
  teamId: string;
  slug: string;
  title: string;
  description?: string;
  template: "skyline" | "watershed" | "minimal" | "bold" | "custom";
  sections: LandingPageSection[];
  intention: {
    primaryCta: {
      text: string;
      action: "email" | "call" | "form" | "calendar" | "link";
      target: string;
    };
    secondaryCta?: {
      text: string;
      action: "email" | "call" | "form" | "calendar" | "link";
      target: string;
    };
    urgency?: string;
    socialProof?: string;
  };
  branding: {
    logo?: string;
    primaryColor: string;
    secondaryColor: string;
    backgroundImage?: string;
    fontFamily?: string;
  };
  seo: {
    metaTitle?: string;
    metaDescription?: string;
    ogImage?: string;
  };
  status: "draft" | "published" | "archived";
}

interface Props {
  page: LandingPageConfig;
}

// Get CTA href based on action type
function getCtaHref(action: string, target: string): string {
  switch (action) {
    case "email":
      return `mailto:${target}`;
    case "call":
      return `tel:${target}`;
    case "calendar":
    case "link":
      return target;
    default:
      return "#";
  }
}

// Get CTA icon
function getCtaIcon(action: string) {
  switch (action) {
    case "email":
      return Mail;
    case "call":
      return Phone;
    case "calendar":
      return Calendar;
    default:
      return ExternalLink;
  }
}

// Hero Section
function HeroSection({
  content,
  branding,
  intention,
}: {
  content: Record<string, unknown>;
  branding: LandingPageConfig["branding"];
  intention: LandingPageConfig["intention"];
}) {
  const CtaIcon = getCtaIcon(intention.primaryCta.action);
  const SecondaryIcon = intention.secondaryCta
    ? getCtaIcon(intention.secondaryCta.action)
    : ArrowRight;

  return (
    <section
      className="relative min-h-screen flex flex-col items-center justify-center px-6 text-center"
      style={{
        backgroundImage: content.backgroundImage
          ? `url('${content.backgroundImage}')`
          : branding.backgroundImage
            ? `url('${branding.backgroundImage}')`
            : undefined,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black/70" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1 }}
        className="relative z-10 max-w-4xl mx-auto"
      >
        {/* Badge */}
        {intention.socialProof && (
          <Badge className="mb-6 bg-white/10 text-white border-white/20 backdrop-blur-sm px-4 py-2">
            <Star className="w-3 h-3 mr-1" />
            {intention.socialProof}
          </Badge>
        )}

        {/* Headline */}
        <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 tracking-tight">
          {String(content.headline || "Your Headline Here")}
        </h1>

        {/* Subheadline */}
        <p className="text-xl md:text-2xl text-white/80 max-w-2xl mx-auto mb-8">
          {String(
            content.subheadline || "Your compelling subheadline goes here",
          )}
        </p>

        {/* Urgency */}
        {intention.urgency && (
          <p className="text-yellow-400 font-medium mb-6">
            {intention.urgency}
          </p>
        )}

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            size="lg"
            className="px-8 py-6 text-lg"
            style={{ backgroundColor: branding.primaryColor }}
            asChild
          >
            <a
              href={getCtaHref(
                intention.primaryCta.action,
                intention.primaryCta.target,
              )}
            >
              <CtaIcon className="mr-2 w-5 h-5" />
              {intention.primaryCta.text}
            </a>
          </Button>

          {intention.secondaryCta && (
            <Button
              size="lg"
              variant="outline"
              className="border-white/30 text-white hover:bg-white/10 px-8 py-6 text-lg"
              asChild
            >
              <a
                href={getCtaHref(
                  intention.secondaryCta.action,
                  intention.secondaryCta.target,
                )}
              >
                <SecondaryIcon className="mr-2 w-5 h-5" />
                {intention.secondaryCta.text}
              </a>
            </Button>
          )}
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
  );
}

// Features Section
function FeaturesSection({
  content,
  branding,
}: {
  content: Record<string, unknown>;
  branding: LandingPageConfig["branding"];
}) {
  const items =
    (content.items as Array<{ name: string; description: string }>) || [];
  const icons = [MessageSquare, Bot, PhoneCall, Handshake];

  return (
    <section className="py-24 px-6 bg-slate-950">
      <div className="max-w-6xl mx-auto">
        <motion.h2
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-3xl md:text-4xl font-bold text-white text-center mb-16"
        >
          {String(content.title || "Features")}
        </motion.h2>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {items.map((item, index) => {
            const Icon = icons[index % icons.length];
            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bg-white/5 border border-white/10 rounded-2xl p-6"
              >
                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center mb-4"
                  style={{ backgroundColor: branding.primaryColor }}
                >
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-white font-semibold text-lg mb-2">
                  {item.name}
                </h3>
                <p className="text-gray-400">{item.description}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// Stats Section
function StatsSection({
  content,
  branding,
}: {
  content: Record<string, unknown>;
  branding: LandingPageConfig["branding"];
}) {
  const items =
    (content.items as Array<{
      value: string;
      label: string;
      sublabel?: string;
    }>) || [];

  return (
    <section className="py-24 px-6 bg-gradient-to-b from-slate-950 to-slate-900">
      <div className="max-w-6xl mx-auto">
        <div className="grid md:grid-cols-3 gap-8">
          {items.map((item, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="text-center p-8 rounded-2xl bg-white/5 border border-white/10"
            >
              <div
                className="text-5xl font-bold mb-2"
                style={{ color: branding.primaryColor }}
              >
                {item.value}
              </div>
              <div className="text-white text-lg font-medium">{item.label}</div>
              {item.sublabel && (
                <div className="text-gray-500 text-sm mt-1">
                  {item.sublabel}
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// Testimonials Section
function TestimonialsSection({
  content,
}: {
  content: Record<string, unknown>;
}) {
  const testimonials =
    (content.items as Array<{
      quote: string;
      name: string;
      title: string;
      image?: string;
    }>) || [];

  return (
    <section className="py-24 px-6 bg-slate-900">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl font-bold text-white text-center mb-16">
          {String(content.title || "What People Say")}
        </h2>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1 }}
              className="bg-white/5 border border-white/10 rounded-2xl p-6"
            >
              <p className="text-gray-300 italic mb-4">"{testimonial.quote}"</p>
              <div className="flex items-center gap-3">
                {testimonial.image ? (
                  <img
                    src={testimonial.image}
                    alt={testimonial.name}
                    className="w-10 h-10 rounded-full"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-white font-bold">
                    {testimonial.name[0]}
                  </div>
                )}
                <div>
                  <div className="text-white font-medium">
                    {testimonial.name}
                  </div>
                  <div className="text-gray-500 text-sm">
                    {testimonial.title}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// CTA Section
function CtaSection({
  content,
  branding,
  intention,
}: {
  content: Record<string, unknown>;
  branding: LandingPageConfig["branding"];
  intention: LandingPageConfig["intention"];
}) {
  const CtaIcon = getCtaIcon(intention.primaryCta.action);
  const SecondaryIcon = intention.secondaryCta
    ? getCtaIcon(intention.secondaryCta.action)
    : ArrowRight;

  return (
    <section className="py-24 px-6 bg-gradient-to-b from-slate-900 to-slate-950">
      <div className="max-w-4xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="p-12 rounded-3xl border border-white/10"
          style={{
            background: `linear-gradient(135deg, ${branding.primaryColor}20, ${branding.secondaryColor}20)`,
          }}
        >
          <Mail
            className="w-12 h-12 mx-auto mb-6"
            style={{ color: branding.primaryColor }}
          />

          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            {String(content.headline || "Ready to Get Started?")}
          </h2>

          {content.subheadline && (
            <p className="text-xl text-gray-300 mb-4">
              {String(content.subheadline)}
            </p>
          )}

          {content.description && (
            <p className="text-gray-400 mb-8 max-w-2xl mx-auto">
              {String(content.description)}
            </p>
          )}

          {intention.urgency && (
            <p className="text-yellow-400 font-medium mb-6">
              {intention.urgency}
            </p>
          )}

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              className="px-10 py-6 text-lg"
              style={{ backgroundColor: branding.primaryColor }}
              asChild
            >
              <a
                href={getCtaHref(
                  intention.primaryCta.action,
                  intention.primaryCta.target,
                )}
              >
                <CtaIcon className="mr-2 w-5 h-5" />
                {intention.primaryCta.text}
              </a>
            </Button>

            {intention.secondaryCta && (
              <Button
                size="lg"
                variant="outline"
                className="border-white/20 text-white hover:bg-white/5 px-10 py-6 text-lg"
                asChild
              >
                <a
                  href={getCtaHref(
                    intention.secondaryCta.action,
                    intention.secondaryCta.target,
                  )}
                >
                  <SecondaryIcon className="mr-2 w-5 h-5" />
                  {intention.secondaryCta.text}
                </a>
              </Button>
            )}
          </div>

          {intention.primaryCta.action === "email" && (
            <p className="text-sm text-gray-500 mt-6">
              {intention.primaryCta.target}
            </p>
          )}
        </motion.div>
      </div>
    </section>
  );
}

// FAQ Section
function FaqSection({ content }: { content: Record<string, unknown> }) {
  const faqs =
    (content.items as Array<{ question: string; answer: string }>) || [];

  return (
    <section className="py-24 px-6 bg-slate-950">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-3xl font-bold text-white text-center mb-16">
          {String(content.title || "Frequently Asked Questions")}
        </h2>

        <div className="space-y-6">
          {faqs.map((faq, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.05 }}
              className="bg-white/5 border border-white/10 rounded-xl p-6"
            >
              <h3 className="text-white font-semibold mb-2">{faq.question}</h3>
              <p className="text-gray-400">{faq.answer}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// Main Renderer
export function LandingPageRenderer({ page }: Props) {
  // Sort sections by order
  const sortedSections = [...page.sections].sort((a, b) => a.order - b.order);

  return (
    <div
      className="min-h-screen bg-slate-950"
      style={
        {
          "--primary-color": page.branding.primaryColor,
          "--secondary-color": page.branding.secondaryColor,
        } as React.CSSProperties
      }
    >
      {sortedSections.map((section) => {
        switch (section.type) {
          case "hero":
            return (
              <HeroSection
                key={section.id}
                content={section.content}
                branding={page.branding}
                intention={page.intention}
              />
            );
          case "features":
            return (
              <FeaturesSection
                key={section.id}
                content={section.content}
                branding={page.branding}
              />
            );
          case "stats":
            return (
              <StatsSection
                key={section.id}
                content={section.content}
                branding={page.branding}
              />
            );
          case "testimonials":
            return (
              <TestimonialsSection key={section.id} content={section.content} />
            );
          case "cta":
            return (
              <CtaSection
                key={section.id}
                content={section.content}
                branding={page.branding}
                intention={page.intention}
              />
            );
          case "faq":
            return <FaqSection key={section.id} content={section.content} />;
          default:
            return null;
        }
      })}

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-white/5 text-center">
        <p className="text-gray-600 text-sm">
          Powered by{" "}
          <a
            href="https://outreachglobal.io"
            className="text-gray-500 hover:text-white"
          >
            NEXTIER
          </a>
        </p>
      </footer>
    </div>
  );
}

export default LandingPageRenderer;
