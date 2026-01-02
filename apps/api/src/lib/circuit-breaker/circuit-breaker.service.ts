import { Injectable, Logger } from "@nestjs/common";

export class CircuitOpenError extends Error {
  constructor(serviceName: string) {
    super(`Circuit breaker is open for service: ${serviceName}`);
    this.name = "CircuitOpenError";
  }
}

interface CircuitState {
  failures: number;
  lastFailure: Date | null;
  state: "closed" | "open" | "half-open";
  successCount: number;
}

interface CircuitBreakerConfig {
  failureThreshold: number;
  resetTimeout: number;
  halfOpenSuccessThreshold: number;
}

const DEFAULT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  resetTimeout: 30000,
  halfOpenSuccessThreshold: 2,
};

@Injectable()
export class CircuitBreakerService {
  private readonly logger = new Logger(CircuitBreakerService.name);
  private circuits: Map<string, CircuitState> = new Map();
  private configs: Map<string, CircuitBreakerConfig> = new Map();

  configure(serviceName: string, config: Partial<CircuitBreakerConfig>) {
    this.configs.set(serviceName, { ...DEFAULT_CONFIG, ...config });
  }

  private getConfig(serviceName: string): CircuitBreakerConfig {
    return this.configs.get(serviceName) || DEFAULT_CONFIG;
  }

  private getCircuit(serviceName: string): CircuitState {
    if (!this.circuits.has(serviceName)) {
      this.circuits.set(serviceName, {
        failures: 0,
        lastFailure: null,
        state: "closed",
        successCount: 0,
      });
    }
    return this.circuits.get(serviceName)!;
  }

  isOpen(serviceName: string): boolean {
    const circuit = this.getCircuit(serviceName);
    const config = this.getConfig(serviceName);

    if (circuit.state === "closed") {
      return false;
    }

    if (circuit.state === "open" && circuit.lastFailure) {
      const timeSinceLastFailure =
        Date.now() - circuit.lastFailure.getTime();
      if (timeSinceLastFailure >= config.resetTimeout) {
        circuit.state = "half-open";
        circuit.successCount = 0;
        this.logger.log(`Circuit ${serviceName} moved to half-open state`);
        return false;
      }
    }

    return circuit.state === "open";
  }

  canExecute(serviceName: string): boolean {
    if (this.isOpen(serviceName)) {
      throw new CircuitOpenError(serviceName);
    }
    return true;
  }

  async execute<T>(
    serviceName: string,
    fn: () => Promise<T>,
  ): Promise<T> {
    this.canExecute(serviceName);

    try {
      const result = await fn();
      this.recordSuccess(serviceName);
      return result;
    } catch (error) {
      this.recordFailure(serviceName);
      throw error;
    }
  }

  recordSuccess(serviceName: string): void {
    const circuit = this.getCircuit(serviceName);
    const config = this.getConfig(serviceName);

    if (circuit.state === "half-open") {
      circuit.successCount++;
      if (circuit.successCount >= config.halfOpenSuccessThreshold) {
        circuit.state = "closed";
        circuit.failures = 0;
        circuit.successCount = 0;
        this.logger.log(`Circuit ${serviceName} closed after recovery`);
      }
    } else if (circuit.state === "closed") {
      circuit.failures = 0;
    }
  }

  recordFailure(serviceName: string): void {
    const circuit = this.getCircuit(serviceName);
    const config = this.getConfig(serviceName);

    circuit.failures++;
    circuit.lastFailure = new Date();

    if (circuit.state === "half-open") {
      circuit.state = "open";
      this.logger.warn(
        `Circuit ${serviceName} reopened after failure in half-open state`,
      );
    } else if (
      circuit.state === "closed" &&
      circuit.failures >= config.failureThreshold
    ) {
      circuit.state = "open";
      this.logger.warn(
        `Circuit ${serviceName} opened after ${circuit.failures} consecutive failures`,
      );
    }
  }

  getState(serviceName: string): CircuitState {
    return { ...this.getCircuit(serviceName) };
  }

  getAllStates(): Record<string, CircuitState> {
    const states: Record<string, CircuitState> = {};
    for (const [name, circuit] of this.circuits) {
      states[name] = { ...circuit };
    }
    return states;
  }

  reset(serviceName: string): void {
    this.circuits.set(serviceName, {
      failures: 0,
      lastFailure: null,
      state: "closed",
      successCount: 0,
    });
    this.logger.log(`Circuit ${serviceName} manually reset`);
  }
}
