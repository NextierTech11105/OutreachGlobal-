"use client";

// Global error boundary - must be ultra-minimal to avoid build issues
// This catches errors at the root level and provides recovery

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <head>
        <title>Error - Nextier</title>
      </head>
      <body style={{
        margin: 0,
        padding: 0,
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#09090b',
        color: '#fafafa',
        fontFamily: 'system-ui, sans-serif'
      }}>
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <h1 style={{ fontSize: '4rem', fontWeight: 'bold', color: '#71717a', margin: 0 }}>500</h1>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '600', marginTop: '1rem' }}>Something went wrong</h2>
          <p style={{ color: '#71717a', marginTop: '0.5rem' }}>
            An unexpected error occurred.
          </p>
          <button
            onClick={() => reset()}
            style={{
              marginTop: '2rem',
              padding: '0.75rem 1.5rem',
              backgroundColor: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '0.5rem',
              cursor: 'pointer',
              fontWeight: '500',
            }}
          >
            Try Again
          </button>
        </div>
      </body>
    </html>
  );
}
