import { useCallback } from 'react';
import { logAction as auditLogAction } from '@/lib/audit-log';

export interface AuditLogData {
  action: string;
  category?: string;
  targetType?: string;
  targetId?: string;
  details?: Record<string, any>;
}

export function useAuditLog() {
  const logAction = useCallback(async (data: AuditLogData) => {
    try {
      // For data browser actions, we'll use a simplified logging approach
      // In production, this would integrate with the full audit system
      console.log('Audit Log:', data);

      // TODO: Integrate with full audit system when user context is available
      // await auditLogAction(data.action, {
      //   category: data.category || 'data_browser',
      //   targetType: data.targetType,
      //   targetId: data.targetId,
      //   details: data.details
      // });
    } catch (error) {
      console.error('Audit logging failed:', error);
    }
  }, []);

  return { logAction };
}