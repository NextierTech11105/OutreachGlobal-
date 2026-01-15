/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * LOGGER UTILITY
 * ═══════════════════════════════════════════════════════════════════════════════
 * Structured logging for Nextier platform.
 * Replaces console.log with tagged, structured output.
 */

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  tag: string;
  message: string;
  data?: Record<string, unknown>;
}

export class Logger {
  private tag: string;
  private minLevel: LogLevel;

  constructor(tag: string, minLevel: LogLevel = "info") {
    this.tag = tag;
    this.minLevel = minLevel;
  }

  private levelValue(level: LogLevel): number {
    const levels = { debug: 0, info: 1, warn: 2, error: 3 };
    return levels[level];
  }

  private shouldLog(level: LogLevel): boolean {
    return this.levelValue(level) >= this.levelValue(this.minLevel);
  }

  private format(level: LogLevel, message: string, data?: Record<string, unknown>): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      tag: this.tag,
      message,
      data,
    };
  }

  private output(entry: LogEntry): void {
    const prefix = `[${entry.tag}]`;
    const msg = `${prefix} ${entry.message}`;

    switch (entry.level) {
      case "debug":
        console.debug(msg, entry.data || "");
        break;
      case "info":
        console.info(msg, entry.data || "");
        break;
      case "warn":
        console.warn(msg, entry.data || "");
        break;
      case "error":
        console.error(msg, entry.data || "");
        break;
    }
  }

  debug(message: string, data?: Record<string, unknown>): void {
    if (this.shouldLog("debug")) {
      this.output(this.format("debug", message, data));
    }
  }

  info(message: string, data?: Record<string, unknown>): void {
    if (this.shouldLog("info")) {
      this.output(this.format("info", message, data));
    }
  }

  warn(message: string, data?: Record<string, unknown>): void {
    if (this.shouldLog("warn")) {
      this.output(this.format("warn", message, data));
    }
  }

  error(message: string, data?: Record<string, unknown>): void {
    if (this.shouldLog("error")) {
      this.output(this.format("error", message, data));
    }
  }
}

// Pre-configured loggers for workers
export const loggers = {
  luci: new Logger("LUCI"),
  neva: new Logger("NEVA"),
  gianna: new Logger("GIANNA"),
  cathy: new Logger("CATHY"),
  sabrina: new Logger("SABRINA"),
  sms: new Logger("SMS"),
  enrichment: new Logger("Enrichment"),
};
