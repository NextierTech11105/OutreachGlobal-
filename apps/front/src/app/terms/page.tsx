"use client";

import { APP_NAME, COMPANY_NAME } from "@/config/branding";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function TermsPage() {
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
          Terms of Service
        </h1>
        <p className="text-muted-foreground mb-8">
          Effective Date: {effectiveDate}
        </p>

        <Card>
          <CardContent className="prose prose-sm dark:prose-invert max-w-none py-8">
            <h2>1. Acceptance of Terms</h2>
            <p>
              By accessing or using {APP_NAME} (&quot;Service&quot;), provided
              by {COMPANY_NAME}
              (&quot;Company,&quot; &quot;we,&quot; &quot;us,&quot; or
              &quot;our&quot;), you agree to be bound by these Terms of Service
              (&quot;Terms&quot;). If you do not agree to these Terms, do not
              use the Service.
            </p>

            <h2>2. Description of Service</h2>
            <p>
              {APP_NAME} is a B2B SaaS platform that provides AI-powered sales
              development tools, including but not limited to:
            </p>
            <ul>
              <li>Lead enrichment and skip tracing services</li>
              <li>SMS and email campaign management</li>
              <li>AI-assisted customer communication</li>
              <li>CRM and pipeline management</li>
              <li>Analytics and reporting</li>
            </ul>

            <h2>3. Account Registration</h2>
            <p>
              To use certain features of the Service, you must register for an
              account. You agree to:
            </p>
            <ul>
              <li>Provide accurate, current, and complete information</li>
              <li>Maintain and promptly update your account information</li>
              <li>Maintain the security of your password and account</li>
              <li>
                Accept responsibility for all activities under your account
              </li>
              <li>Notify us immediately of any unauthorized use</li>
            </ul>

            <h2>4. Subscription and Payment</h2>
            <p>
              <strong>4.1 Billing.</strong> Subscription fees are billed in
              advance on a monthly or annual basis. All fees are non-refundable
              except as required by law.
            </p>
            <p>
              <strong>4.2 Automatic Renewal.</strong> Subscriptions
              automatically renew unless cancelled before the renewal date.
            </p>
            <p>
              <strong>4.3 Usage Limits.</strong> Your plan includes specific
              usage limits. Exceeding these limits may result in additional
              charges or service restrictions.
            </p>
            <p>
              <strong>4.4 Price Changes.</strong> We may modify pricing with 30
              days&apos; notice. Continued use after price changes constitutes
              acceptance.
            </p>

            <h2>5. Acceptable Use Policy</h2>
            <p>You agree NOT to use the Service to:</p>
            <ul>
              <li>Violate any applicable laws or regulations</li>
              <li>
                Send unsolicited messages (spam) or violate CAN-SPAM, TCPA, or
                similar laws
              </li>
              <li>Harass, abuse, or harm others</li>
              <li>Transmit malware or malicious code</li>
              <li>Interfere with the Service&apos;s operation</li>
              <li>Attempt to gain unauthorized access to systems</li>
              <li>Scrape or collect data in violation of third-party terms</li>
              <li>Impersonate any person or entity</li>
              <li>Use the Service for any illegal purpose</li>
            </ul>

            <h2>6. SMS and Telecommunications Compliance</h2>
            <p>
              <strong>6.1 TCPA Compliance.</strong> You are solely responsible
              for ensuring your use of SMS features complies with the Telephone
              Consumer Protection Act (TCPA) and all other applicable
              telecommunications laws.
            </p>
            <p>
              <strong>6.2 Consent.</strong> You must obtain proper consent
              before sending any SMS messages and maintain records of such
              consent.
            </p>
            <p>
              <strong>6.3 Opt-Out.</strong> You must honor all opt-out requests
              within 24 hours.
            </p>

            <h2>7. Data and Privacy</h2>
            <p>
              Your use of the Service is also governed by our{" "}
              <Link href="/privacy" className="text-primary hover:underline">
                Privacy Policy
              </Link>
              . By using the Service, you consent to the collection and use of
              data as described therein.
            </p>

            <h2>8. Intellectual Property</h2>
            <p>
              <strong>8.1 Our Rights.</strong> The Service, including all
              content, features, and functionality, is owned by {COMPANY_NAME}{" "}
              and protected by intellectual property laws.
            </p>
            <p>
              <strong>8.2 Your Content.</strong> You retain ownership of data
              you upload. You grant us a license to use such data solely to
              provide the Service.
            </p>
            <p>
              <strong>8.3 Feedback.</strong> Any feedback you provide may be
              used by us without obligation to you.
            </p>

            <h2>9. Third-Party Services</h2>
            <p>
              The Service integrates with third-party services (e.g., Stripe,
              Calendly, SignalHouse). Your use of these services is subject to
              their respective terms. We are not responsible for third-party
              services.
            </p>

            <h2>10. Disclaimer of Warranties</h2>
            <p>
              THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS
              AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR
              IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF
              MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR
              NON-INFRINGEMENT.
            </p>

            <h2>11. Limitation of Liability</h2>
            <p>
              TO THE MAXIMUM EXTENT PERMITTED BY LAW,{" "}
              {COMPANY_NAME.toUpperCase()} SHALL NOT BE LIABLE FOR ANY INDIRECT,
              INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY
              LOSS OF PROFITS OR REVENUES, WHETHER INCURRED DIRECTLY OR
              INDIRECTLY, OR ANY LOSS OF DATA, USE, GOODWILL, OR OTHER
              INTANGIBLE LOSSES.
            </p>
            <p>
              OUR TOTAL LIABILITY SHALL NOT EXCEED THE AMOUNTS PAID BY YOU IN
              THE TWELVE (12) MONTHS PRIOR TO THE CLAIM.
            </p>

            <h2>12. Indemnification</h2>
            <p>
              You agree to indemnify and hold harmless {COMPANY_NAME}, its
              officers, directors, employees, and agents from any claims,
              damages, losses, or expenses arising from your use of the Service
              or violation of these Terms.
            </p>

            <h2>13. Termination</h2>
            <p>
              <strong>13.1 By You.</strong> You may cancel your subscription at
              any time through your account settings.
            </p>
            <p>
              <strong>13.2 By Us.</strong> We may suspend or terminate your
              account for violation of these Terms or for any reason with 30
              days&apos; notice.
            </p>
            <p>
              <strong>13.3 Effect.</strong> Upon termination, your right to use
              the Service ceases immediately. Data may be deleted after a
              reasonable retention period.
            </p>

            <h2>14. Dispute Resolution</h2>
            <p>
              <strong>14.1 Arbitration.</strong> Any disputes shall be resolved
              through binding arbitration in accordance with the American
              Arbitration Association rules.
            </p>
            <p>
              <strong>14.2 Class Action Waiver.</strong> You agree to resolve
              disputes individually and waive any right to participate in class
              actions.
            </p>

            <h2>15. General Provisions</h2>
            <p>
              <strong>15.1 Governing Law.</strong> These Terms are governed by
              the laws of the State of Delaware, without regard to conflict of
              law principles.
            </p>
            <p>
              <strong>15.2 Entire Agreement.</strong> These Terms constitute the
              entire agreement between you and {COMPANY_NAME} regarding the
              Service.
            </p>
            <p>
              <strong>15.3 Modifications.</strong> We may modify these Terms at
              any time. Material changes will be notified via email or Service
              notification.
            </p>
            <p>
              <strong>15.4 Severability.</strong> If any provision is found
              unenforceable, the remaining provisions remain in effect.
            </p>

            <h2>16. Contact Information</h2>
            <p>For questions about these Terms, please contact us at:</p>
            <p>
              <strong>{COMPANY_NAME}</strong>
              <br />
              Email:{" "}
              <a
                href="mailto:legal@nextier.io"
                className="text-primary hover:underline"
              >
                legal@nextier.io
              </a>
              <br />
              Or visit our{" "}
              <Link href="/contact" className="text-primary hover:underline">
                Contact Page
              </Link>
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
