/**
 * Billing GraphQL Resolver
 * Exposes billing operations via GraphQL
 */
import { Resolver, Query, Mutation, Args, Context } from "@nestjs/graphql";
import {
  ObjectType,
  Field,
  Int,
  Float,
  InputType,
  registerEnumType,
} from "@nestjs/graphql";
import { Logger } from "@nestjs/common";
import { CreditService, CreditType } from "../services/credit.service";
import { StripeService } from "../services/stripe.service";
import { UseAuthGuard } from "@/app/auth/decorators";

// Register CreditType enum for GraphQL
enum GqlCreditType {
  AI = "ai",
  ENRICHMENT = "enrichment",
  SMS = "sms",
  EMAIL = "email",
}

registerEnumType(GqlCreditType, {
  name: "CreditType",
  description: "Types of credits available in the platform",
});

// GraphQL Object Types
@ObjectType()
class CreditBalance {
  @Field(() => GqlCreditType)
  creditType: GqlCreditType;

  @Field(() => Int)
  balance: number;

  @Field(() => Int)
  usedThisMonth: number;
}

@ObjectType()
class AllCreditBalances {
  @Field(() => Int)
  ai: number;

  @Field(() => Int)
  enrichment: number;

  @Field(() => Int)
  sms: number;

  @Field(() => Int)
  email: number;
}

@ObjectType()
class CheckoutSession {
  @Field()
  sessionId: string;

  @Field()
  url: string;
}

@ObjectType()
class CreditCheckResult {
  @Field()
  hasCredits: boolean;

  @Field(() => Int)
  balance: number;

  @Field(() => Int)
  required: number;
}

// Input Types
@InputType()
class SubscriptionCheckoutInput {
  @Field()
  planId: string;

  @Field()
  successUrl: string;

  @Field()
  cancelUrl: string;
}

@InputType()
class CreditPackCheckoutInput {
  @Field()
  packId: string;

  @Field()
  successUrl: string;

  @Field()
  cancelUrl: string;
}

@Resolver()
@UseAuthGuard()
export class BillingResolver {
  private readonly logger = new Logger(BillingResolver.name);

  constructor(
    private creditService: CreditService,
    private stripeService: StripeService,
  ) {}

  /**
   * Get all credit balances for the current team
   */
  @Query(() => AllCreditBalances, { name: "creditBalances" })
  async getCreditBalances(@Context() ctx: any): Promise<AllCreditBalances> {
    const teamId = ctx.req?.user?.teamId || ctx.teamId;
    const balances = await this.creditService.getAllBalances(teamId);

    return {
      ai: balances.ai,
      enrichment: balances.enrichment,
      sms: balances.sms,
      email: balances.email,
    };
  }

  /**
   * Check if team has sufficient credits for an operation
   */
  @Query(() => CreditCheckResult, { name: "checkCredits" })
  async checkCredits(
    @Args("creditType", { type: () => GqlCreditType }) creditType: GqlCreditType,
    @Args("amount", { type: () => Int }) amount: number,
    @Context() ctx: any,
  ): Promise<CreditCheckResult> {
    const teamId = ctx.req?.user?.teamId || ctx.teamId;
    const balance = await this.creditService.getBalance(
      teamId,
      creditType as unknown as CreditType,
    );

    return {
      hasCredits: balance >= amount,
      balance,
      required: amount,
    };
  }

  /**
   * Create a Stripe checkout session for subscription
   */
  @Mutation(() => CheckoutSession, { name: "createSubscriptionCheckout" })
  async createSubscriptionCheckout(
    @Args("input") input: SubscriptionCheckoutInput,
    @Context() ctx: any,
  ): Promise<CheckoutSession> {
    const teamId = ctx.req?.user?.teamId || ctx.teamId;
    const email = ctx.req?.user?.email;

    this.logger.log(`Creating subscription checkout for team ${teamId}`);

    const session = await this.stripeService.createCheckoutSession({
      teamId,
      planId: input.planId,
      successUrl: input.successUrl,
      cancelUrl: input.cancelUrl,
      customerEmail: email,
    });

    return session;
  }

  /**
   * Create a Stripe checkout session for credit pack purchase
   */
  @Mutation(() => CheckoutSession, { name: "createCreditPackCheckout" })
  async createCreditPackCheckout(
    @Args("input") input: CreditPackCheckoutInput,
    @Context() ctx: any,
  ): Promise<CheckoutSession> {
    const teamId = ctx.req?.user?.teamId || ctx.teamId;

    this.logger.log(`Creating credit pack checkout for team ${teamId}`);

    const session = await this.stripeService.createCreditPackCheckout({
      teamId,
      packId: input.packId,
      successUrl: input.successUrl,
      cancelUrl: input.cancelUrl,
    });

    return session;
  }

  /**
   * Create a Stripe billing portal session
   */
  @Mutation(() => String, { name: "createBillingPortalSession" })
  async createBillingPortalSession(
    @Args("returnUrl") returnUrl: string,
    @Context() ctx: any,
  ): Promise<string> {
    const teamId = ctx.req?.user?.teamId || ctx.teamId;

    this.logger.log(`Creating billing portal session for team ${teamId}`);

    return this.stripeService.createBillingPortalSession(teamId, returnUrl);
  }
}
