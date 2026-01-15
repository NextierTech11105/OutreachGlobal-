"use client";

import { APP_NAME, COMPANY_NAME } from "@/config/branding";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PrivacyPage() {
  const effectiveDate = "January 15, 2025";

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Link href="/get-started">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>

        <Badge className="mb-4" variant="secondary">
          Legal
        </Badge>
        <h1 className="text-4xl font-bold tracking-tight mb-2">
          Privacy Policy
        </h1>
        <p className="text-muted-foreground mb-8">
          Effective Date: {effectiveDate}
        </p>

        <Card>
          <CardContent className="prose prose-sm dark:prose-invert max-w-none py-8">
            <h2>1. Introduction</h2>
            <p>
              {COMPANY_NAME} (&quot;Company,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) respects your
              privacy and is committed to protecting your personal data. This Privacy
              Policy explains how we collect, use, disclose, and safeguard your information
              when you use {APP_NAME} (&quot;Service&quot;).
            </p>

            <h2>2. Information We Collect</h2>

            <h3>2.1 Information You Provide</h3>
            <ul>
              <li><strong>Account Information:</strong> Name, email address, phone number, company name, job title</li>
              <li><strong>Payment Information:</strong> Billing address, payment card details (processed securely by Stripe)</li>
              <li><strong>Communication Data:</strong> Messages, support tickets, feedback</li>
              <li><strong>Business Data:</strong> Lead lists, contact information, campaign content you upload</li>
            </ul>

            <h3>2.2 Information Collected Automatically</h3>
            <ul>
              <li><strong>Usage Data:</strong> Features used, pages visited, actions taken</li>
              <li><strong>Device Information:</strong> IP address, browser type, operating system</li>
              <li><strong>Cookies:</strong> Session cookies, analytics cookies, preference cookies</li>
              <li><strong>Log Data:</strong> Access times, error logs, referral URLs</li>
            </ul>

            <h3>2.3 Information from Third Parties</h3>
            <ul>
              <li><strong>Enrichment Data:</strong> Business information from data providers (e.g., skip trace services)</li>
              <li><strong>Integration Data:</strong> Data from connected services (e.g., calendars, CRMs)</li>
            </ul>

            <h2>3. How We Use Your Information</h2>
            <p>We use collected information to:</p>
            <ul>
              <li>Provide, maintain, and improve the Service</li>
              <li>Process transactions and send related information</li>
              <li>Send administrative communications (updates, security alerts)</li>
              <li>Respond to inquiries and provide customer support</li>
              <li>Monitor and analyze usage patterns and trends</li>
              <li>Detect, prevent, and address technical issues and fraud</li>
              <li>Comply with legal obligations</li>
              <li>Enforce our Terms of Service</li>
            </ul>

            <h2>4. Data Sharing and Disclosure</h2>
            <p>We may share your information with:</p>

            <h3>4.1 Service Providers</h3>
            <p>
              Third-party vendors who perform services on our behalf, including:
            </p>
            <ul>
              <li>Payment processing (Stripe)</li>
              <li>Email delivery services</li>
              <li>SMS gateway providers (SignalHouse)</li>
              <li>Data enrichment services (skip trace providers)</li>
              <li>Cloud hosting (Vercel, AWS)</li>
              <li>Analytics providers</li>
            </ul>

            <h3>4.2 Legal Requirements</h3>
            <p>
              We may disclose information if required by law, court order, or government
              request, or to protect our rights, property, or safety.
            </p>

            <h3>4.3 Business Transfers</h3>
            <p>
              In connection with a merger, acquisition, or sale of assets, your information
              may be transferred to the acquiring entity.
            </p>

            <h3>4.4 With Your Consent</h3>
            <p>
              We may share information for other purposes with your explicit consent.
            </p>

            <h2>5. Data Security</h2>
            <p>
              We implement appropriate technical and organizational measures to protect
              your data, including:
            </p>
            <ul>
              <li>Encryption in transit (TLS/SSL) and at rest</li>
              <li>Access controls and authentication</li>
              <li>Regular security assessments</li>
              <li>Employee training on data protection</li>
              <li>Secure data centers with physical security</li>
            </ul>
            <p>
              However, no method of transmission over the Internet is 100% secure. We
              cannot guarantee absolute security.
            </p>

            <h2>6. Data Retention</h2>
            <p>
              We retain your information for as long as necessary to:
            </p>
            <ul>
              <li>Provide the Service</li>
              <li>Comply with legal obligations</li>
              <li>Resolve disputes</li>
              <li>Enforce agreements</li>
            </ul>
            <p>
              Upon account termination, we will delete or anonymize your data within 90
              days, except where retention is required by law.
            </p>

            <h2>7. Your Rights and Choices</h2>

            <h3>7.1 Access and Portability</h3>
            <p>
              You may request a copy of your personal data in a portable format.
            </p>

            <h3>7.2 Correction</h3>
            <p>
              You may update or correct your information through your account settings
              or by contacting us.
            </p>

            <h3>7.3 Deletion</h3>
            <p>
              You may request deletion of your personal data, subject to legal retention
              requirements.
            </p>

            <h3>7.4 Opt-Out</h3>
            <p>
              You may opt out of marketing communications at any time by clicking
              &quot;unsubscribe&quot; in emails or contacting us.
            </p>

            <h3>7.5 Do Not Track</h3>
            <p>
              We do not currently respond to &quot;Do Not Track&quot; browser signals.
            </p>

            <h2>8. Cookies and Tracking</h2>
            <p>
              We use cookies and similar technologies for:
            </p>
            <ul>
              <li><strong>Essential Cookies:</strong> Required for Service functionality</li>
              <li><strong>Analytics Cookies:</strong> To understand usage patterns</li>
              <li><strong>Preference Cookies:</strong> To remember your settings</li>
            </ul>
            <p>
              You can control cookies through your browser settings, but disabling
              certain cookies may affect Service functionality.
            </p>

            <h2>9. California Privacy Rights (CCPA)</h2>
            <p>
              California residents have additional rights under the CCPA:
            </p>
            <ul>
              <li>Right to know what personal information is collected</li>
              <li>Right to request deletion of personal information</li>
              <li>Right to opt-out of sale of personal information</li>
              <li>Right to non-discrimination for exercising privacy rights</li>
            </ul>
            <p>
              <strong>We do not sell personal information.</strong> To exercise your
              rights, contact us at privacy@nextier.io.
            </p>

            <h2>10. International Data Transfers</h2>
            <p>
              Your information may be transferred to and processed in countries outside
              your residence. We ensure appropriate safeguards are in place for such
              transfers in compliance with applicable laws.
            </p>

            <h2>11. Children&apos;s Privacy</h2>
            <p>
              The Service is not intended for individuals under 18 years of age. We do
              not knowingly collect personal information from children. If you believe
              we have collected information from a child, please contact us immediately.
            </p>

            <h2>12. Third-Party Links</h2>
            <p>
              The Service may contain links to third-party websites. We are not
              responsible for the privacy practices of these sites. We encourage you
              to review their privacy policies.
            </p>

            <h2>13. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you
              of material changes by email or through the Service. Your continued use
              after changes constitutes acceptance of the updated policy.
            </p>

            <h2>14. Contact Us</h2>
            <p>
              For questions or concerns about this Privacy Policy or our data practices,
              please contact us:
            </p>
            <p>
              <strong>{COMPANY_NAME}</strong>
              <br />
              Email:{" "}
              <a href="mailto:privacy@nextier.io" className="text-primary hover:underline">
                privacy@nextier.io
              </a>
              <br />
              Or visit our{" "}
              <Link href="/contact" className="text-primary hover:underline">
                Contact Page
              </Link>
            </p>

            <h2>15. Data Protection Officer</h2>
            <p>
              For GDPR-related inquiries, you may contact our Data Protection Officer at:{" "}
              <a href="mailto:dpo@nextier.io" className="text-primary hover:underline">
                dpo@nextier.io
              </a>
            </p>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground mt-8">
          Last updated: {effectiveDate}
        </p>
      </div>
    </div>
  );
}
