/**
 * Billing Controller
 * REST endpoints for billing operations (checkout, portal, etc.)
 */
import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Logger,
  Req,
} from "@nestjs/common";
import { StripeService } from "../services/stripe.service";
import { CreditService, CreditType } from "../services/credit.service";
import { AuthGuard } from "@/app/auth/guards/auth.guard";

interface CreateCheckoutDto {
  planId: string;
  successUrl: string;
  cancelUrl: string;
}

interface CreateCreditPackCheckoutDto {
  packId: string;
  successUrl: string;
  cancelUrl: string;
}

interface CreatePortalSessionDto {
  returnUrl: string;
}

@Controller("billing")
@UseGuards(AuthGuard)
export class BillingController {
  private readonly logger = new Logger(BillingController.name);

  constructor(
    private stripeService: StripeService,
    private creditService: CreditService,
  ) {}

  /**
   * Get current credit balances for the team
   */
  @Get("credits")
  async getCredits(@Req() req: any): Promise<{
    balances: Record<CreditType, number>;
    teamId: string;
  }> {
    const teamId = req.user?.teamId || req.teamId;
    const balances = await this.creditService.getAllBalances(teamId);

    return {
      balances,
      teamId,
    };
  }

  /**
   * Create a Stripe checkout session for subscription
   */
  @Post("checkout/subscription")
  async createSubscriptionCheckout(
    @Body() dto: CreateCheckoutDto,
    @Req() req: any,
  ): Promise<{ sessionId: string; url: string }> {
    const teamId = req.user?.teamId || req.teamId;
    const email = req.user?.email;

    this.logger.log(`Creating subscription checkout for team ${teamId}`);

    const session = await this.stripeService.createCheckoutSession({
      teamId,
      planId: dto.planId,
      successUrl: dto.successUrl,
      cancelUrl: dto.cancelUrl,
      customerEmail: email,
    });

    return session;
  }

  /**
   * Create a Stripe checkout session for credit pack purchase
   */
  @Post("checkout/credits")
  async createCreditPackCheckout(
    @Body() dto: CreateCreditPackCheckoutDto,
    @Req() req: any,
  ): Promise<{ sessionId: string; url: string }> {
    const teamId = req.user?.teamId || req.teamId;

    this.logger.log(`Creating credit pack checkout for team ${teamId}`);

    const session = await this.stripeService.createCreditPackCheckout({
      teamId,
      packId: dto.packId,
      successUrl: dto.successUrl,
      cancelUrl: dto.cancelUrl,
    });

    return session;
  }

  /**
   * Create a Stripe billing portal session for managing subscription
   */
  @Post("portal")
  async createPortalSession(
    @Body() dto: CreatePortalSessionDto,
    @Req() req: any,
  ): Promise<{ url: string }> {
    const teamId = req.user?.teamId || req.teamId;

    this.logger.log(`Creating billing portal session for team ${teamId}`);

    const url = await this.stripeService.createBillingPortalSession(
      teamId,
      dto.returnUrl,
    );

    return { url };
  }

  /**
   * Check if team has sufficient credits for an operation
   */
  @Post("credits/check")
  async checkCredits(
    @Body() body: { creditType: CreditType; amount: number },
    @Req() req: any,
  ): Promise<{ hasCredits: boolean; balance: number }> {
    const teamId = req.user?.teamId || req.teamId;
    const hasCredits = await this.creditService.hasCredits(
      teamId,
      body.creditType,
      body.amount,
    );
    const balance = await this.creditService.getBalance(teamId, body.creditType);

    return { hasCredits, balance };
  }
}
