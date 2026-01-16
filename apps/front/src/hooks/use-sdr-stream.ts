/**
 * useSDRStream - Real-time SSE hook for SDR console
 *
 * Connects to /api/sdr/stream for real-time agent activity updates.
 * Auto-reconnects on disconnect with exponential backoff.
 */

"use client";

import { useEffect, useCallback, useReducer, useRef } from "react";

// Activity types from the API
export interface SDRActivity {
  id: string;
  agent: "GIANNA" | "CATHY" | "SABRINA" | "LUCI" | "COPILOT";
  action: string;
  leadId: string | null;
  messageId: string | null;
  conversationId: string | null;
  status: "pending" | "approved" | "rejected" | "auto_sent" | "expired";
  requiresApproval: boolean;
  slaDeadline: string | null;
  payload: Record<string, unknown> | null;
  createdAt: string;
}

export interface SDRStreamState {
  connected: boolean;
  activities: SDRActivity[];
  pendingApprovals: SDRActivity[];
  error: string | null;
  lastEventId: string | null;
}

type SDRStreamAction =
  | { type: "CONNECTED" }
  | { type: "DISCONNECTED" }
  | { type: "ERROR"; payload: string }
  | { type: "ACTIVITY"; payload: SDRActivity }
  | { type: "INITIAL_ACTIVITIES"; payload: SDRActivity[] }
  | { type: "APPROVAL_UPDATED"; payload: { id: string; status: string } }
  | { type: "CLEAR_ERROR" };

const initialState: SDRStreamState = {
  connected: false,
  activities: [],
  pendingApprovals: [],
  error: null,
  lastEventId: null,
};

function reducer(state: SDRStreamState, action: SDRStreamAction): SDRStreamState {
  switch (action.type) {
    case "CONNECTED":
      return { ...state, connected: true, error: null };

    case "DISCONNECTED":
      return { ...state, connected: false };

    case "ERROR":
      return { ...state, error: action.payload, connected: false };

    case "ACTIVITY": {
      const activity = action.payload;
      const newActivities = [activity, ...state.activities].slice(0, 100); // Keep last 100

      const newPending = activity.requiresApproval && activity.status === "pending"
        ? [activity, ...state.pendingApprovals.filter((a) => a.id !== activity.id)]
        : state.pendingApprovals;

      return {
        ...state,
        activities: newActivities,
        pendingApprovals: newPending,
        lastEventId: activity.id,
      };
    }

    case "INITIAL_ACTIVITIES": {
      const pending = action.payload.filter(
        (a) => a.requiresApproval && a.status === "pending",
      );
      return {
        ...state,
        activities: action.payload,
        pendingApprovals: pending,
        lastEventId: action.payload[0]?.id ?? null,
      };
    }

    case "APPROVAL_UPDATED": {
      const { id, status } = action.payload;
      return {
        ...state,
        activities: state.activities.map((a) =>
          a.id === id ? { ...a, status: status as SDRActivity["status"] } : a,
        ),
        pendingApprovals: state.pendingApprovals.filter((a) => a.id !== id),
      };
    }

    case "CLEAR_ERROR":
      return { ...state, error: null };

    default:
      return state;
  }
}

interface UseSDRStreamOptions {
  enabled?: boolean;
  onActivity?: (activity: SDRActivity) => void;
  onError?: (error: string) => void;
}

export function useSDRStream(options: UseSDRStreamOptions = {}) {
  const { enabled = true, onActivity, onError } = options;

  const [state, dispatch] = useReducer(reducer, initialState);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);

  const connect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const url = state.lastEventId
      ? `/api/sdr/stream?lastEventId=${state.lastEventId}`
      : "/api/sdr/stream";

    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      dispatch({ type: "CONNECTED" });
      reconnectAttempts.current = 0;
    };

    eventSource.onerror = () => {
      dispatch({ type: "DISCONNECTED" });
      eventSource.close();

      // Exponential backoff for reconnection
      const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
      reconnectAttempts.current++;

      if (enabled) {
        reconnectTimeoutRef.current = setTimeout(connect, delay);
      }
    };

    // Handle connection event
    eventSource.addEventListener("connected", (e) => {
      const data = JSON.parse((e as MessageEvent).data);
      console.log("[SDR Stream] Connected:", data);
    });

    // Handle reconnect request
    eventSource.addEventListener("reconnect", () => {
      eventSource.close();
      if (enabled) {
        setTimeout(connect, 1000);
      }
    });

    // Handle activity events
    const activityHandler = (e: Event) => {
      try {
        const activity: SDRActivity = JSON.parse((e as MessageEvent).data);
        dispatch({ type: "ACTIVITY", payload: activity });
        onActivity?.(activity);
      } catch (error) {
        console.error("[SDR Stream] Parse error:", error);
      }
    };

    // Subscribe to all event types
    ["activity", "suggestion", "approval", "rejection", "auto_send", "enrichment", "booking"].forEach(
      (eventType) => {
        eventSource.addEventListener(eventType, activityHandler);
      },
    );

    // Handle errors
    eventSource.addEventListener("error", (e) => {
      try {
        const data = JSON.parse((e as MessageEvent).data);
        dispatch({ type: "ERROR", payload: data.message });
        onError?.(data.message);
      } catch {
        // Network error, not a custom error event
      }
    });
  }, [enabled, state.lastEventId, onActivity, onError]);

  // Connect on mount
  useEffect(() => {
    if (enabled) {
      connect();
    }

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [enabled, connect]);

  // Batch approve/reject
  const batchApprove = useCallback(async (activityIds: string[]) => {
    try {
      const response = await fetch("/api/sdr/approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve", activityIds }),
      });

      if (!response.ok) {
        throw new Error("Approval failed");
      }

      const result = await response.json();

      // Update local state
      activityIds.forEach((id) => {
        dispatch({ type: "APPROVAL_UPDATED", payload: { id, status: "approved" } });
      });

      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Approval failed";
      dispatch({ type: "ERROR", payload: message });
      throw error;
    }
  }, []);

  const batchReject = useCallback(
    async (activityIds: string[], reason: string, customReason?: string) => {
      try {
        const response = await fetch("/api/sdr/approvals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "reject",
            activityIds,
            reason,
            customReason,
          }),
        });

        if (!response.ok) {
          throw new Error("Rejection failed");
        }

        const result = await response.json();

        // Update local state
        activityIds.forEach((id) => {
          dispatch({ type: "APPROVAL_UPDATED", payload: { id, status: "rejected" } });
        });

        return result;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Rejection failed";
        dispatch({ type: "ERROR", payload: message });
        throw error;
      }
    },
    [],
  );

  const clearError = useCallback(() => {
    dispatch({ type: "CLEAR_ERROR" });
  }, []);

  return {
    ...state,
    batchApprove,
    batchReject,
    clearError,
    reconnect: connect,
  };
}
