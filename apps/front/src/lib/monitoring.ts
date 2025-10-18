/**
 * Get a standardized error message from any error type
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }

  return "An unknown error occurred";
}

/**
 * Log an error with context
 */
export function logError(error: unknown, context?: Record<string, any>) {
  console.error("Error:", getErrorMessage(error), "Context:", context || {});

  // In a production app, you might send this to an error monitoring service
  // like Sentry, LogRocket, etc.
}

/**
 * Track an event for analytics
 */
export function trackEvent(name: string, properties?: Record<string, any>) {
  console.log("Event:", name, "Properties:", properties || {});

  // In a production app, you might send this to an analytics service
  // like Segment, Amplitude, etc.
}
