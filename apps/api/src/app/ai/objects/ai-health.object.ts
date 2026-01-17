/**
 * AI Health Status GraphQL Objects
 *
 * Exposes circuit breaker state and AI provider health
 * for monitoring dashboards and alerting.
 */

import { Field, ObjectType, Int, registerEnumType } from "@nestjs/graphql";

// ═══════════════════════════════════════════════════════════════════════════════
// ENUMS
// ═══════════════════════════════════════════════════════════════════════════════

export enum CircuitState {
  CLOSED = "CLOSED",
  OPEN = "OPEN",
  HALF_OPEN = "HALF_OPEN",
}

registerEnumType(CircuitState, {
  name: "CircuitState",
  description: "Circuit breaker state for AI provider",
});

// ═══════════════════════════════════════════════════════════════════════════════
// HEALTH STATUS OBJECTS
// ═══════════════════════════════════════════════════════════════════════════════

@ObjectType()
export class AiProviderHealth {
  @Field()
  provider: string;

  @Field()
  configured: boolean;

  @Field()
  working: boolean;

  @Field({ nullable: true })
  error?: string;

  @Field({ nullable: true })
  model?: string;
}

@ObjectType()
export class CircuitBreakerStatus {
  @Field()
  name: string;

  @Field(() => CircuitState)
  state: CircuitState;

  @Field(() => Int)
  failures: number;

  @Field(() => Int)
  successes: number;

  @Field(() => Int)
  totalRequests: number;

  @Field(() => Int)
  totalFailures: number;

  @Field(() => Int)
  totalSuccesses: number;

  @Field({ nullable: true })
  lastFailureTime?: Date;

  @Field({ nullable: true })
  lastSuccessTime?: Date;

  @Field({ nullable: true })
  openedAt?: Date;
}

@ObjectType()
export class AiHealthStatus {
  @Field()
  healthy: boolean;

  @Field()
  timestamp: Date;

  @Field(() => [AiProviderHealth])
  providers: AiProviderHealth[];

  @Field(() => [CircuitBreakerStatus])
  circuitBreakers: CircuitBreakerStatus[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// MUTATION PAYLOADS
// ═══════════════════════════════════════════════════════════════════════════════

@ObjectType()
export class ResetCircuitBreakerPayload {
  @Field()
  success: boolean;

  @Field()
  provider: string;

  @Field(() => CircuitState)
  newState: CircuitState;
}
