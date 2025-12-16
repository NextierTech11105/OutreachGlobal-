import { Injectable, Logger, ForbiddenException } from "@nestjs/common";
import { InjectDB } from "@/database/decorators";
import { DrizzleClient } from "@/database/types";
import {
  creditBalancesTable,
  creditTransactionsTable,
  apiUsageTable,
  subscriptionsTable,
} from "@/database/schema-alias";
import { eq, and, sql } from "drizzle-orm";

export type CreditType = "ai" | "enrichment" | "sms" | "email";

export interface DeductCreditsOptions {
  teamId: string;
  creditType: CreditType;
  amount: number;
  referenceType?: string;
  referenceId?: string;
  description?: string;
  metadata?: Record<string, any>;
}

export interface AddCreditsOptions {
  teamId: string;
  creditType: CreditType;
  amount: number;
  transactionType: "subscription" | "purchase" | "refund" | "adjustment" | "monthly_reset";
  stripePaymentIntentId?: string;
  description?: string;
  metadata?: Record<string, any>;
}

export interface UsageTrackingOptions {
  teamId: string;
  service: "openai" | "anthropic" | "realestateapi" | "signalhouse" | "twilio" | "sendgrid" | "apollo";
  endpoint?: string;
  creditsUsed: number;
  tokensInput?: number;
  tokensOutput?: number;
  costCents?: number;
  success?: boolean;
  errorMessage?: string;
  responseTimeMs?: number;
  metadata?: Record<string, any>;
}

@Injectable()
export class CreditService {
  private readonly logger = new Logger(CreditService.name);

  constructor(@InjectDB() private db: DrizzleClient) {}

  /**
   * Get credit balance for a team
   */
  async getBalance(teamId: string, creditType: CreditType): Promise<number> {
    const balance = await this.db.query.creditBalances.findFirst({
      where: and(
        eq(creditBalancesTable.teamId, teamId),
        eq(creditBalancesTable.creditType, creditType),
      ),
    });

    return balance?.balance ?? 0;
  }

  /**
   * Get all credit balances for a team
   */
  async getAllBalances(teamId: string): Promise<Record<CreditType, number>> {
    const balances = await this.db
      .select()
      .from(creditBalancesTable)
      .where(eq(creditBalancesTable.teamId, teamId));

    const result: Record<CreditType, number> = {
      ai: 0,
      enrichment: 0,
      sms: 0,
      email: 0,
    };

    for (const b of balances) {
      result[b.creditType as CreditType] = b.balance;
    }

    return result;
  }

  /**
   * Check if team has enough credits
   */
  async hasCredits(
    teamId: string,
    creditType: CreditType,
    amount: number,
  ): Promise<boolean> {
    const balance = await this.getBalance(teamId, creditType);
    return balance >= amount;
  }

  /**
   * Check credits and throw if insufficient
   */
  async requireCredits(
    teamId: string,
    creditType: CreditType,
    amount: number,
  ): Promise<void> {
    const hasEnough = await this.hasCredits(teamId, creditType, amount);
    if (!hasEnough) {
      const balance = await this.getBalance(teamId, creditType);
      throw new ForbiddenException({
        code: "INSUFFICIENT_CREDITS",
        message: `Insufficient ${creditType} credits. Required: ${amount}, Available: ${balance}`,
        creditType,
        required: amount,
        available: balance,
      });
    }
  }

  /**
   * Deduct credits from team balance
   */
  async deductCredits(options: DeductCreditsOptions): Promise<{
    success: boolean;
    balanceBefore: number;
    balanceAfter: number;
  }> {
    const { teamId, creditType, amount, referenceType, referenceId, description, metadata } = options;

    // Get current balance
    const currentBalance = await this.getBalance(teamId, creditType);

    if (currentBalance < amount) {
      return {
        success: false,
        balanceBefore: currentBalance,
        balanceAfter: currentBalance,
      };
    }

    const newBalance = currentBalance - amount;

    // Update balance
    await this.db
      .insert(creditBalancesTable)
      .values({
        teamId,
        creditType,
        balance: newBalance,
      })
      .onConflictDoUpdate({
        target: [creditBalancesTable.teamId, creditBalancesTable.creditType],
        set: {
          balance: newBalance,
          usedThisMonth: sql`${creditBalancesTable.usedThisMonth} + ${amount}`,
          updatedAt: new Date(),
        },
      });

    // Record transaction
    await this.db.insert(creditTransactionsTable).values({
      teamId,
      creditType,
      amount: -amount, // Negative for debit
      balanceBefore: currentBalance,
      balanceAfter: newBalance,
      transactionType: "usage",
      referenceType,
      referenceId,
      description: description || `Used ${amount} ${creditType} credits`,
      metadata,
    });

    this.logger.log(
      `Deducted ${amount} ${creditType} credits from team ${teamId}. Balance: ${currentBalance} -> ${newBalance}`,
    );

    return {
      success: true,
      balanceBefore: currentBalance,
      balanceAfter: newBalance,
    };
  }

  /**
   * Add credits to team balance
   */
  async addCredits(options: AddCreditsOptions): Promise<{
    balanceBefore: number;
    balanceAfter: number;
  }> {
    const {
      teamId,
      creditType,
      amount,
      transactionType,
      stripePaymentIntentId,
      description,
      metadata,
    } = options;

    // Get current balance
    const currentBalance = await this.getBalance(teamId, creditType);
    const newBalance = currentBalance + amount;

    // Update balance
    await this.db
      .insert(creditBalancesTable)
      .values({
        teamId,
        creditType,
        balance: newBalance,
      })
      .onConflictDoUpdate({
        target: [creditBalancesTable.teamId, creditBalancesTable.creditType],
        set: {
          balance: newBalance,
          updatedAt: new Date(),
        },
      });

    // Record transaction
    await this.db.insert(creditTransactionsTable).values({
      teamId,
      creditType,
      amount, // Positive for credit
      balanceBefore: currentBalance,
      balanceAfter: newBalance,
      transactionType,
      stripePaymentIntentId,
      description: description || `Added ${amount} ${creditType} credits`,
      metadata,
    });

    this.logger.log(
      `Added ${amount} ${creditType} credits to team ${teamId}. Balance: ${currentBalance} -> ${newBalance}`,
    );

    return {
      balanceBefore: currentBalance,
      balanceAfter: newBalance,
    };
  }

  /**
   * Track API usage (for analytics and cost tracking)
   */
  async trackUsage(options: UsageTrackingOptions): Promise<void> {
    await this.db.insert(apiUsageTable).values({
      teamId: options.teamId,
      service: options.service,
      endpoint: options.endpoint,
      creditsUsed: options.creditsUsed,
      tokensInput: options.tokensInput,
      tokensOutput: options.tokensOutput,
      costCents: options.costCents,
      success: options.success ?? true,
      errorMessage: options.errorMessage,
      responseTimeMs: options.responseTimeMs,
      metadata: options.metadata,
    });
  }

  /**
   * Deduct credits and track usage in one call
   */
  async useCredits(
    deductOptions: DeductCreditsOptions,
    usageOptions: Omit<UsageTrackingOptions, "teamId" | "creditsUsed">,
  ): Promise<{ success: boolean; balanceAfter: number }> {
    const result = await this.deductCredits(deductOptions);

    if (result.success) {
      await this.trackUsage({
        teamId: deductOptions.teamId,
        creditsUsed: deductOptions.amount,
        ...usageOptions,
      });
    }

    return {
      success: result.success,
      balanceAfter: result.balanceAfter,
    };
  }

  /**
   * Get usage summary for a team
   */
  async getUsageSummary(
    teamId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<{
    totalCreditsUsed: Record<CreditType, number>;
    totalCostCents: number;
    usageByService: Record<string, number>;
  }> {
    // This would be a more complex query in practice
    // For now, return placeholder
    return {
      totalCreditsUsed: { ai: 0, enrichment: 0, sms: 0, email: 0 },
      totalCostCents: 0,
      usageByService: {},
    };
  }

  /**
   * Check if team is using BYOK (Bring Your Own Keys)
   */
  async isUsingByok(teamId: string): Promise<boolean> {
    const subscription = await this.db.query.subscriptions.findFirst({
      where: eq(subscriptionsTable.teamId, teamId),
      with: {
        // Would need to join with plans table to check allowByok
      },
    });

    // Check team settings for custom API keys
    // If they have their own keys, they're BYOK
    return false; // Default to not BYOK
  }
}
