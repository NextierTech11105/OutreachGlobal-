"use client";

import {
  useState,
  useEffect,
  useCallback,
  createContext,
  useContext,
} from "react";
import { useParams } from "next/navigation";
import {
  TenantConfigData,
  NEXTIER_DEFAULT_CONFIG,
  WorkerConfig,
  WorkerRole,
} from "./types";

/**
 * TENANT CONFIG HOOK
 * ═══════════════════════════════════════════════════════════════════════════════
 * React hook for accessing tenant configuration throughout the app.
 *
 * Usage:
 *   const { config, workers, getWorker, isLoading } = useTenantConfig();
 *   const opener = getWorker("opener"); // Returns GIANNA for NEXTIER, custom for others
 *
 * Falls back to NEXTIER_DEFAULT_CONFIG if no tenant config exists.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

interface TenantConfigContextValue {
  config: TenantConfigData;
  workers: WorkerConfig[];
  isLoading: boolean;
  error: string | null;
  // Helpers
  getWorker: (roleOrId: WorkerRole | string) => WorkerConfig | undefined;
  getWorkerName: (roleOrId: WorkerRole | string) => string;
  getEnabledWorkers: () => WorkerConfig[];
  getBranding: () => TenantConfigData["branding"];
  getMessaging: () => TenantConfigData["messaging"];
  getIcp: () => TenantConfigData["icp"];
  // Actions
  refreshConfig: () => Promise<void>;
  updateConfig: (updates: Partial<TenantConfigData>) => Promise<boolean>;
}

const TenantConfigContext = createContext<TenantConfigContextValue | null>(
  null,
);

// Cache for tenant config (prevents refetching on every mount)
const configCache = new Map<
  string,
  { config: TenantConfigData; timestamp: number }
>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export function TenantConfigProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams<{ team?: string }>();
  const teamSlug = params?.team || "default";

  const [config, setConfig] = useState<TenantConfigData>(
    NEXTIER_DEFAULT_CONFIG,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch config from API or cache
  const fetchConfig = useCallback(async () => {
    const cacheKey = teamSlug;
    const cached = configCache.get(cacheKey);

    // Return cached if fresh
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      setConfig(cached.config);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`/api/tenant/config?team=${teamSlug}`);
      const data = await res.json();

      if (data.success && data.config) {
        setConfig(data.config);
        configCache.set(cacheKey, {
          config: data.config,
          timestamp: Date.now(),
        });
      } else {
        // Fallback to NEXTIER default
        setConfig(NEXTIER_DEFAULT_CONFIG);
      }
      setError(null);
    } catch (err) {
      console.error("[TenantConfig] Fetch error:", err);
      setError("Failed to load config");
      // Fallback to NEXTIER default
      setConfig(NEXTIER_DEFAULT_CONFIG);
    } finally {
      setIsLoading(false);
    }
  }, [teamSlug]);

  // Load on mount
  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  // Get worker by role or ID
  const getWorker = useCallback(
    (roleOrId: WorkerRole | string): WorkerConfig | undefined => {
      // First try by ID
      let worker = config.workers.find((w) => w.id === roleOrId);
      if (worker) return worker;
      // Then try by role
      worker = config.workers.find((w) => w.role === roleOrId);
      return worker;
    },
    [config.workers],
  );

  // Get worker name (convenience for displaying in UI)
  const getWorkerName = useCallback(
    (roleOrId: WorkerRole | string): string => {
      const worker = getWorker(roleOrId);
      return worker?.name || roleOrId.toUpperCase();
    },
    [getWorker],
  );

  // Get all enabled workers
  const getEnabledWorkers = useCallback((): WorkerConfig[] => {
    return config.workers.filter((w) => w.enabled);
  }, [config.workers]);

  // Get branding config
  const getBranding = useCallback(() => config.branding, [config.branding]);

  // Get messaging config
  const getMessaging = useCallback(() => config.messaging, [config.messaging]);

  // Get ICP config
  const getIcp = useCallback(() => config.icp, [config.icp]);

  // Refresh config (invalidate cache)
  const refreshConfig = useCallback(async () => {
    configCache.delete(teamSlug);
    await fetchConfig();
  }, [teamSlug, fetchConfig]);

  // Update config
  const updateConfig = useCallback(
    async (updates: Partial<TenantConfigData>): Promise<boolean> => {
      try {
        const res = await fetch(`/api/tenant/config`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ team: teamSlug, updates }),
        });
        const data = await res.json();

        if (data.success) {
          // Update local state and cache
          const newConfig = { ...config, ...updates };
          setConfig(newConfig);
          configCache.set(teamSlug, {
            config: newConfig,
            timestamp: Date.now(),
          });
          return true;
        }
        return false;
      } catch (err) {
        console.error("[TenantConfig] Update error:", err);
        return false;
      }
    },
    [teamSlug, config],
  );

  const value: TenantConfigContextValue = {
    config,
    workers: config.workers,
    isLoading,
    error,
    getWorker,
    getWorkerName,
    getEnabledWorkers,
    getBranding,
    getMessaging,
    getIcp,
    refreshConfig,
    updateConfig,
  };

  return (
    <TenantConfigContext.Provider value={value}>
      {children}
    </TenantConfigContext.Provider>
  );
}

// Hook to use tenant config
export function useTenantConfig(): TenantConfigContextValue {
  const context = useContext(TenantConfigContext);

  // If used outside provider, return default values
  if (!context) {
    return {
      config: NEXTIER_DEFAULT_CONFIG,
      workers: NEXTIER_DEFAULT_CONFIG.workers,
      isLoading: false,
      error: null,
      getWorker: (roleOrId) =>
        NEXTIER_DEFAULT_CONFIG.workers.find(
          (w) => w.id === roleOrId || w.role === roleOrId,
        ),
      getWorkerName: (roleOrId) => {
        const worker = NEXTIER_DEFAULT_CONFIG.workers.find(
          (w) => w.id === roleOrId || w.role === roleOrId,
        );
        return worker?.name || roleOrId.toUpperCase();
      },
      getEnabledWorkers: () =>
        NEXTIER_DEFAULT_CONFIG.workers.filter((w) => w.enabled),
      getBranding: () => NEXTIER_DEFAULT_CONFIG.branding,
      getMessaging: () => NEXTIER_DEFAULT_CONFIG.messaging,
      getIcp: () => NEXTIER_DEFAULT_CONFIG.icp,
      refreshConfig: async () => {},
      updateConfig: async () => false,
    };
  }

  return context;
}

// Export types for convenience
export type { TenantConfigData, WorkerConfig, WorkerRole };
