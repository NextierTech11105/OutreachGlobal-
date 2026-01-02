/**
 * Pino Logger Module
 *
 * Provides structured JSON logging for production with pretty printing in development.
 *
 * INSTALLATION REQUIRED:
 *   pnpm add nestjs-pino pino-http pino pino-pretty
 *
 * Then uncomment the LoggerModule import in app.module.ts
 */
import { Module } from "@nestjs/common";
import { LoggerModule as PinoLoggerModule } from "nestjs-pino";

const isProduction = process.env.NODE_ENV === "production";

@Module({
  imports: [
    PinoLoggerModule.forRoot({
      pinoHttp: {
        // Request ID for correlation
        genReqId: (req) => {
          const existingId = req.headers["x-correlation-id"];
          if (existingId) return existingId as string;
          return `req_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
        },

        // Custom log level based on status code
        customLogLevel: (_req, res, err) => {
          if (res.statusCode >= 500 || err) return "error";
          if (res.statusCode >= 400) return "warn";
          return "info";
        },

        // Redact sensitive fields
        redact: {
          paths: [
            "req.headers.authorization",
            "req.headers.cookie",
            "req.body.password",
            "req.body.token",
            "req.body.apiKey",
            "req.body.authToken",
          ],
          censor: "[REDACTED]",
        },

        // Serializers for request/response
        serializers: {
          req: (req) => ({
            method: req.method,
            url: req.url,
            query: req.query,
            params: req.params,
            correlationId: req.id,
          }),
          res: (res) => ({
            statusCode: res.statusCode,
          }),
        },

        // Production: JSON, Development: Pretty print
        transport: isProduction
          ? undefined // Native JSON in production
          : {
              target: "pino-pretty",
              options: {
                colorize: true,
                singleLine: false,
                translateTime: "SYS:standard",
                ignore: "pid,hostname",
              },
            },

        // Log level from environment
        level: process.env.LOG_LEVEL || (isProduction ? "info" : "debug"),

        // Base context for all logs
        base: {
          service: "nextier-api",
          env: process.env.NODE_ENV || "development",
        },

        // Disable request logging for health checks
        autoLogging: {
          ignore: (req) => {
            const url = req.url || "";
            return (
              url.includes("/health") ||
              url.includes("/ready") ||
              url.includes("/live")
            );
          },
        },
      },
    }),
  ],
  exports: [PinoLoggerModule],
})
export class LoggerModule {}
