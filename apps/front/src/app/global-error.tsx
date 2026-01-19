"use client";

// Global error boundary - cannot use hooks at top level
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // Simple error page - no hooks, no context
  return (
    <html lang="en">
      <body style={{
        fontFamily: "system-ui, sans-serif",
        backgroundColor: "#111",
        color: "#fff",
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        margin: 0,
      }}>
        <div style={{ padding: "40px", textAlign: "center", maxWidth: "500px" }}>
          <h2 style={{ marginBottom: "16px" }}>Something went wrong</h2>
          <p style={{ color: "#888", marginBottom: "24px" }}>
            {error.digest ? `Error ID: ${error.digest}` : "An unexpected error occurred"}
          </p>
          <button
            onClick={() => reset()}
            style={{
              padding: "12px 24px",
              backgroundColor: "#6366f1",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "14px",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
