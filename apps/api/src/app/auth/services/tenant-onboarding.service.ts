import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectDB } from "@/database/decorators";
import { DrizzleClient } from "@/database/types";
import { tenants, TenantState, ProductPack } from "@/database/schema/api-keys.schema";
import { eq } from "drizzle-orm";
import { ApiKeyService } from "./api-key.service";
import { MailService } from "@/lib/mail/mail.service";

// ═══════════════════════════════════════════════════════════════════════════
// TENANT ONBOARDING SERVICE
// ═══════════════════════════════════════════════════════════════════════════
//
// Handles the full onboarding flow when a customer pays:
//
// 1. Upgrade tenant: DEMO → PENDING_ONBOARDING
// 2. Create production API keys (ADMIN_KEY + DEV_KEY)
// 3. Send onboarding email with:
//    - Thank you message
//    - API keys (shown once!)
//    - Strategy session invite link
//
// After the founder strategy session, call activateTenant() to enable execution.
//
// ═══════════════════════════════════════════════════════════════════════════

export interface ProvisionPaidTenantInput {
  tenantId?: string;
  tenantSlug?: string;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  productPack: ProductPack;
  customerEmail: string;
  customerName?: string;
}

export interface ProvisionPaidTenantResult {
  success: boolean;
  tenantId?: string;
  adminKeyPrefix?: string;
  devKeyPrefix?: string;
  error?: string;
}

@Injectable()
export class TenantOnboardingService {
  private readonly logger = new Logger(TenantOnboardingService.name);
  private readonly strategySessionUrl: string;
  private readonly platformUrl: string;

  constructor(
    private configService: ConfigService,
    @InjectDB() private db: DrizzleClient,
    private apiKeyService: ApiKeyService,
    private mailService: MailService,
  ) {
    // Calendly or Cal.com link for founder strategy session
    this.strategySessionUrl =
      this.configService.get("STRATEGY_SESSION_URL") ||
      "https://calendly.com/outreachglobal/strategy-session";

    this.platformUrl =
      this.configService.get("PLATFORM_URL") ||
      "https://app.outreachglobal.io";
  }

  /**
   * Provision a paid tenant after Stripe payment
   *
   * This is called by the Stripe webhook when a subscription is created.
   * It upgrades the tenant, creates API keys, and sends the onboarding email.
   */
  async provisionPaidTenant(
    input: ProvisionPaidTenantInput,
  ): Promise<ProvisionPaidTenantResult> {
    try {
      // Find the tenant
      let tenant;
      if (input.tenantId) {
        tenant = await this.db.query.tenants.findFirst({
          where: eq(tenants.id, input.tenantId),
        });
      } else if (input.tenantSlug) {
        tenant = await this.db.query.tenants.findFirst({
          where: eq(tenants.slug, input.tenantSlug),
        });
      }

      if (!tenant) {
        // Create a new tenant if one doesn't exist
        this.logger.log(
          `Creating new tenant for Stripe customer ${input.stripeCustomerId}`,
        );

        const newTenant = await this.apiKeyService.createTenant({
          name: input.customerName || `Customer ${input.stripeCustomerId.slice(-8)}`,
          slug: `tenant-${input.stripeCustomerId.slice(-12).toLowerCase()}`,
          contactEmail: input.customerEmail,
          contactName: input.customerName,
          productPack: input.productPack,
          stripeCustomerId: input.stripeCustomerId,
          stripeSubscriptionId: input.stripeSubscriptionId,
        });

        tenant = await this.db.query.tenants.findFirst({
          where: eq(tenants.id, newTenant.id),
        });
      }

      if (!tenant) {
        throw new Error("Failed to find or create tenant");
      }

      // Update tenant with Stripe info and move to PENDING_ONBOARDING
      await this.db
        .update(tenants)
        .set({
          stripeCustomerId: input.stripeCustomerId,
          stripeSubscriptionId: input.stripeSubscriptionId,
          productPack: input.productPack,
          state: TenantState.PENDING_ONBOARDING,
          billingStatus: "active",
          trialEndsAt: null, // No longer on trial
          updatedAt: new Date(),
        })
        .where(eq(tenants.id, tenant.id));

      this.logger.log(
        `Upgraded tenant ${tenant.slug} to PENDING_ONBOARDING`,
      );

      // Create production API keys
      const { adminKey, devKey } = await this.apiKeyService.createPaidKeys(
        tenant.id,
        input.productPack,
        input.stripeSubscriptionId,
      );

      this.logger.log(
        `Created API keys for tenant ${tenant.slug}: ${adminKey.keyPrefix}, ${devKey.keyPrefix}`,
      );

      // Send onboarding email
      await this.sendOnboardingEmail({
        to: input.customerEmail,
        customerName: input.customerName || tenant.name,
        tenantName: tenant.name,
        adminKey: adminKey.key, // Raw key - only shown once!
        devKey: devKey.key, // Raw key - only shown once!
        productPack: input.productPack,
      });

      this.logger.log(
        `Sent onboarding email to ${input.customerEmail} for tenant ${tenant.slug}`,
      );

      return {
        success: true,
        tenantId: tenant.id,
        adminKeyPrefix: adminKey.keyPrefix,
        devKeyPrefix: devKey.keyPrefix,
      };
    } catch (error) {
      this.logger.error(`Failed to provision paid tenant:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Activate a tenant after founder strategy session
   *
   * This enables execution scopes (messages:send, calls:initiate).
   * Call this after completing the onboarding call.
   */
  async activateTenant(
    tenantId: string,
    completedBy: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const tenant = await this.db.query.tenants.findFirst({
        where: eq(tenants.id, tenantId),
      });

      if (!tenant) {
        return { success: false, error: "Tenant not found" };
      }

      if (tenant.state === TenantState.LIVE) {
        return { success: true }; // Already live
      }

      // Update to LIVE state
      await this.db
        .update(tenants)
        .set({
          state: TenantState.LIVE,
          onboardingCompletedAt: new Date(),
          onboardingCompletedBy: completedBy,
          updatedAt: new Date(),
        })
        .where(eq(tenants.id, tenantId));

      this.logger.log(
        `Activated tenant ${tenant.slug} - now LIVE (completed by ${completedBy})`,
      );

      // Send activation confirmation email
      if (tenant.contactEmail) {
        await this.sendActivationEmail({
          to: tenant.contactEmail,
          customerName: tenant.contactName || tenant.name,
          tenantName: tenant.name,
        });
      }

      return { success: true };
    } catch (error) {
      this.logger.error(`Failed to activate tenant ${tenantId}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Send onboarding email with API keys and strategy session invite
   */
  private async sendOnboardingEmail(params: {
    to: string;
    customerName: string;
    tenantName: string;
    adminKey: string;
    devKey: string;
    productPack: ProductPack;
  }): Promise<void> {
    const subject = `🎉 Welcome to OutreachGlobal - Let's Get You Started!`;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">

  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 28px;">Welcome to OutreachGlobal!</h1>
    <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Your B2B outreach platform is ready</p>
  </div>

  <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 12px 12px;">

    <p style="font-size: 18px;">Hi ${params.customerName},</p>

    <p>Thank you for choosing OutreachGlobal! We're excited to help you scale your B2B outreach and grow your pipeline.</p>

    <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px;">
      <strong>⚡ Important: Your API Keys (Save These Now!)</strong>
      <p style="margin: 10px 0 0 0; font-size: 14px;">These keys are shown only once. Please copy and store them securely.</p>
    </div>

    <div style="background: #1a1a2e; color: #fff; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <p style="margin: 0 0 10px 0; color: #a0a0a0; font-size: 12px;">PRODUCTION API KEY (Full Access)</p>
      <code style="display: block; background: #0d0d1a; padding: 12px; border-radius: 4px; font-size: 13px; word-break: break-all; color: #4ade80;">${params.adminKey}</code>

      <p style="margin: 20px 0 10px 0; color: #a0a0a0; font-size: 12px;">DEVELOPMENT API KEY (Safe Sandbox - No Live Execution)</p>
      <code style="display: block; background: #0d0d1a; padding: 12px; border-radius: 4px; font-size: 13px; word-break: break-all; color: #60a5fa;">${params.devKey}</code>
    </div>

    <div style="background: #d4edda; border-left: 4px solid #28a745; padding: 15px; margin: 20px 0; border-radius: 4px;">
      <strong>📞 Next Step: Book Your Strategy Session</strong>
      <p style="margin: 10px 0;">Before we enable live messaging and calling, let's hop on a quick call to:</p>
      <ul style="margin: 10px 0; padding-left: 20px;">
        <li>Configure your ideal customer profile</li>
        <li>Set up your messaging sequences</li>
        <li>Connect your SignalHouse phone numbers</li>
        <li>Review compliance and best practices</li>
      </ul>
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${this.strategySessionUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
        Book Your Strategy Session →
      </a>
    </div>

    <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">

    <p style="font-size: 14px; color: #666;">
      <strong>Your Plan:</strong> ${formatProductPack(params.productPack)}<br>
      <strong>Status:</strong> Pending Onboarding (execution disabled until strategy session)
    </p>

    <p style="font-size: 14px; color: #666;">
      Questions? Reply to this email or reach us at <a href="mailto:support@outreachglobal.io">support@outreachglobal.io</a>
    </p>

    <p style="margin-top: 30px;">
      Best,<br>
      <strong>Tyler Baughman</strong><br>
      Founder, OutreachGlobal
    </p>

  </div>

</body>
</html>
    `;

    const text = `
Welcome to OutreachGlobal!

Hi ${params.customerName},

Thank you for choosing OutreachGlobal! We're excited to help you scale your B2B outreach.

⚡ YOUR API KEYS (Save These Now!)
These keys are shown only once. Please copy and store them securely.

PRODUCTION API KEY:
${params.adminKey}

DEVELOPMENT API KEY (Safe Sandbox):
${params.devKey}

📞 NEXT STEP: Book Your Strategy Session
Before we enable live messaging and calling, let's hop on a quick call to configure your account.

Book here: ${this.strategySessionUrl}

Your Plan: ${formatProductPack(params.productPack)}
Status: Pending Onboarding (execution disabled until strategy session)

Questions? Email support@outreachglobal.io

Best,
Tyler Baughman
Founder, OutreachGlobal
    `;

    await this.mailService.sendNow({
      to: params.to,
      subject,
      html,
      text,
    });
  }

  /**
   * Send activation confirmation email
   */
  private async sendActivationEmail(params: {
    to: string;
    customerName: string;
    tenantName: string;
  }): Promise<void> {
    const subject = `🚀 You're Live! OutreachGlobal is Ready to Go`;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">

  <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 28px;">🚀 You're Live!</h1>
    <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Full platform access is now enabled</p>
  </div>

  <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 12px 12px;">

    <p style="font-size: 18px;">Hi ${params.customerName},</p>

    <p>Great news! Your OutreachGlobal account is now fully activated.</p>

    <div style="background: #d4edda; border-left: 4px solid #28a745; padding: 15px; margin: 20px 0; border-radius: 4px;">
      <strong>✅ What's Now Enabled:</strong>
      <ul style="margin: 10px 0; padding-left: 20px;">
        <li>Live SMS and MMS messaging</li>
        <li>Voice call initiation</li>
        <li>Campaign execution</li>
        <li>Full analytics access</li>
      </ul>
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${this.platformUrl}" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
        Go to Dashboard →
      </a>
    </div>

    <p style="font-size: 14px; color: #666;">
      Need help? Reply to this email or check our documentation.
    </p>

    <p style="margin-top: 30px;">
      Let's crush it,<br>
      <strong>Tyler Baughman</strong><br>
      Founder, OutreachGlobal
    </p>

  </div>

</body>
</html>
    `;

    await this.mailService.sendNow({
      to: params.to,
      subject,
      html,
    });
  }
}

/**
 * Format product pack name for display
 */
function formatProductPack(pack: ProductPack): string {
  const names: Record<ProductPack, string> = {
    [ProductPack.DATA_ENGINE]: "Data Engine",
    [ProductPack.CAMPAIGN_ENGINE]: "Campaign Engine",
    [ProductPack.SEQUENCE_DESIGNER]: "Sequence Designer",
    [ProductPack.INBOX_CALL_CENTER]: "Inbox & Call Center",
    [ProductPack.ANALYTICS_COMMAND]: "Analytics Command",
    [ProductPack.FULL_PLATFORM]: "Full Platform",
  };
  return names[pack] || pack;
}
