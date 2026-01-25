import { useCallback, useRef } from 'react';
import { trackEvent } from '@/lib/monitoring';

export interface PerformanceMetric {
  operation: string;
  duration: number;
  metadata?: Record<string, any>;
}

export interface MonitoringData {
  event: string;
  properties?: Record<string, any>;
}

export function useMonitoring() {
  const startTimes = useRef<Map<string, number>>(new Map());

  const startTracking = useCallback((operationId: string) => {
    startTimes.current.set(operationId, Date.now());
  }, []);

  const trackPerformance = useCallback((operation: string, duration: number, metadata?: Record<string, any>) => {
    try {
      console.log('Performance:', operation, `${duration}ms`, metadata || {});

      // Track with analytics
      trackEvent('performance_metric', {
        operation,
        duration,
        ...metadata
      });
    } catch (error) {
      console.error('Performance tracking failed:', error);
    }
  }, []);

  const endTracking = useCallback((operationId: string, metadata?: Record<string, any>) => {
    const startTime = startTimes.current.get(operationId);
    if (startTime) {
      const duration = Date.now() - startTime;
      startTimes.current.delete(operationId);
      trackPerformance(operationId, duration, metadata);
    }
  }, [trackPerformance]);

  const trackUserAction = useCallback((event: string, properties?: Record<string, any>) => {
    try {
      console.log('User Action:', event, properties || {});
      trackEvent(event, properties);
    } catch (error) {
      console.error('User action tracking failed:', error);
    }
  }, []);

  return {
    startTracking,
    endTracking,
    trackPerformance,
    trackUserAction
  };
}