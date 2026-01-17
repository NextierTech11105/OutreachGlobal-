/**
 * Circuit Breaker Pattern for AI Providers
 *
 * Prevents cascading failures by:
 * 1. Tracking failures per provider
 * 2. Opening circuit when failures exceed threshold
 * 3. Allowing test request after cooldown
 * 4. Closing circuit when test succeeds
 *
 * States:
 * - CLOSED: Normal operation, requests pass through
 * - OPEN: Provider failing, requests rejected immediately
 * - HALF_OPEN: Testing if provider recovered
 */

import { Logger } from "@/lib/logger";

export enum CircuitState {
  CLOSED = "CLOSED",
  OPEN = "OPEN",
  HALF_OPEN = "HALF_OPEN",
}

export interface CircuitBreakerConfig {
  /** Number of failures before opening circuit */
  failureThreshold: number;
  /** Time in ms before attempting recovery */
  recoveryTimeoutMs: number;
  /** Number of successes in half-open to close circuit */
  successThreshold: number;
  /** Provider name for logging */
  name: string;
}

interface CircuitStats {
  state: CircuitState;
  failures: number;
  successes: number;
  lastFailureTime: number | null;
  lastSuccessTime: number | null;
  openedAt: number | null;
  totalRequests: number;
  totalFailures: number;
  totalSuccesses: number;
}

const DEFAULT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  recoveryTimeoutMs: 30000, // 30 seconds
  successThreshold: 2,
  name: "unknown",
};

// Global circuit breaker registry
const circuits = new Map<string, CircuitBreaker>();

export class CircuitBreaker {
  private config: CircuitBreakerConfig;
  private stats: CircuitStats;

  constructor(config: Partial<CircuitBreakerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.stats = {
      state: CircuitState.CLOSED,
      failures: 0,
      successes: 0,
      lastFailureTime: null,
      lastSuccessTime: null,
      openedAt: null,
      totalRequests: 0,
      totalFailures: 0,
      totalSuccesses: 0,
    };
  }

  /**
   * Get or create a circuit breaker for a provider
   */
  static forProvider(name: string, config?: Partial<CircuitBreakerConfig>): CircuitBreaker {
    if (!circuits.has(name)) {
      circuits.set(name, new CircuitBreaker({ ...config, name }));
    }
    return circuits.get(name)!;
  }

  /**
   * Get all circuit breaker stats (for monitoring)
   */
  static getAllStats(): Record<string, CircuitStats & { name: string }> {
    const allStats: Record<string, CircuitStats & { name: string }> = {};
    circuits.forEach((breaker, name) => {
      allStats[name] = { ...breaker.getStats(), name };
    });
    return allStats;
  }

  /**
   * Reset all circuit breakers (for testing)
   */
  static resetAll(): void {
    circuits.forEach((breaker) => breaker.reset());
  }

  /**
   * Check if request should be allowed
   */
  canExecute(): boolean {
    this.updateState();
    return this.stats.state !== CircuitState.OPEN;
  }

  /**
   * Execute a function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    this.stats.totalRequests++;

    // Check if circuit allows execution
    if (!this.canExecute()) {
      Logger.warn("CircuitBreaker", `Circuit OPEN for ${this.config.name}`, {
        stats: this.getStats(),
      });
      throw new CircuitBreakerError(
        `Circuit breaker OPEN for ${this.config.name}. Service unavailable.`,
        this.config.name,
        this.stats.state
      );
    }

    try {
      const result = await fn();
      this.recordSuccess();
      return result;
    } catch (error) {
      this.recordFailure(error);
      throw error;
    }
  }

  /**
   * Record a successful request
   */
  recordSuccess(): void {
    this.stats.successes++;
    this.stats.totalSuccesses++;
    this.stats.lastSuccessTime = Date.now();

    if (this.stats.state === CircuitState.HALF_OPEN) {
      if (this.stats.successes >= this.config.successThreshold) {
        this.closeCircuit();
      }
    } else if (this.stats.state === CircuitState.CLOSED) {
      // Reset failure count on success
      this.stats.failures = 0;
    }
  }

  /**
   * Record a failed request
   */
  recordFailure(error?: unknown): void {
    this.stats.failures++;
    this.stats.totalFailures++;
    this.stats.lastFailureTime = Date.now();
    this.stats.successes = 0; // Reset success count on failure

    const errorMessage = error instanceof Error ? error.message : String(error);

    if (this.stats.state === CircuitState.HALF_OPEN) {
      // Failure in half-open immediately opens circuit
      this.openCircuit();
      Logger.warn("CircuitBreaker", `${this.config.name} failed in HALF_OPEN, reopening`, {
        error: errorMessage,
      });
    } else if (this.stats.failures >= this.config.failureThreshold) {
      this.openCircuit();
      Logger.error("CircuitBreaker", `${this.config.name} circuit OPENED`, {
        failures: this.stats.failures,
        threshold: this.config.failureThreshold,
        error: errorMessage,
      });
    }
  }

  /**
   * Get current circuit stats
   */
  getStats(): CircuitStats {
    this.updateState();
    return { ...this.stats };
  }

  /**
   * Reset the circuit breaker
   */
  reset(): void {
    this.stats = {
      state: CircuitState.CLOSED,
      failures: 0,
      successes: 0,
      lastFailureTime: null,
      lastSuccessTime: null,
      openedAt: null,
      totalRequests: this.stats.totalRequests,
      totalFailures: this.stats.totalFailures,
      totalSuccesses: this.stats.totalSuccesses,
    };
    Logger.info("CircuitBreaker", `${this.config.name} circuit RESET`);
  }

  /**
   * Force the circuit to a specific state (for testing/admin)
   */
  forceState(state: CircuitState): void {
    this.stats.state = state;
    if (state === CircuitState.OPEN) {
      this.stats.openedAt = Date.now();
    }
    Logger.info("CircuitBreaker", `${this.config.name} circuit forced to ${state}`);
  }

  private openCircuit(): void {
    this.stats.state = CircuitState.OPEN;
    this.stats.openedAt = Date.now();
    this.stats.successes = 0;
  }

  private closeCircuit(): void {
    this.stats.state = CircuitState.CLOSED;
    this.stats.failures = 0;
    this.stats.successes = 0;
    this.stats.openedAt = null;
    Logger.info("CircuitBreaker", `${this.config.name} circuit CLOSED (recovered)`);
  }

  private updateState(): void {
    if (this.stats.state === CircuitState.OPEN) {
      const timeSinceOpen = Date.now() - (this.stats.openedAt || 0);
      if (timeSinceOpen >= this.config.recoveryTimeoutMs) {
        this.stats.state = CircuitState.HALF_OPEN;
        this.stats.successes = 0;
        this.stats.failures = 0;
        Logger.info("CircuitBreaker", `${this.config.name} circuit HALF_OPEN (testing recovery)`);
      }
    }
  }
}

/**
 * Custom error for circuit breaker rejections
 */
export class CircuitBreakerError extends Error {
  constructor(
    message: string,
    public readonly provider: string,
    public readonly state: CircuitState
  ) {
    super(message);
    this.name = "CircuitBreakerError";
  }
}

// Pre-configured circuit breakers for AI providers
export const openaiCircuit = CircuitBreaker.forProvider("openai", {
  failureThreshold: 5,
  recoveryTimeoutMs: 30000,
  successThreshold: 2,
});

export const perplexityCircuit = CircuitBreaker.forProvider("perplexity", {
  failureThreshold: 5,
  recoveryTimeoutMs: 30000,
  successThreshold: 2,
});

export const anthropicCircuit = CircuitBreaker.forProvider("anthropic", {
  failureThreshold: 5,
  recoveryTimeoutMs: 30000,
  successThreshold: 2,
});
