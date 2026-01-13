/**
 * TENANT CONFIG MODULE
 * ═══════════════════════════════════════════════════════════════════════════════
 * Multi-tenant white-label configuration system.
 *
 * Usage:
 *   import { useTenantConfig, TenantConfigProvider } from "@/lib/tenant";
 *
 *   // In layout or app:
 *   <TenantConfigProvider>
 *     <App />
 *   </TenantConfigProvider>
 *
 *   // In components:
 *   const { config, getWorkerName, getBranding } = useTenantConfig();
 *   const openerName = getWorkerName("opener"); // "GIANNA" for NEXTIER
 * ═══════════════════════════════════════════════════════════════════════════════
 */

export * from "./types";
export * from "./use-tenant-config";
