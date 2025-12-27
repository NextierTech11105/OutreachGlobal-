'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: '#0a0a0a',
        color: '#fafafa',
        margin: 0,
        fontFamily: 'system-ui, sans-serif'
      }}>
        <h1 style={{ fontSize: '4rem', fontWeight: 'bold', color: '#666' }}>500</h1>
        <p style={{ color: '#888' }}>Something went wrong</p>
        <button
          onClick={reset}
          style={{
            marginTop: '1rem',
            padding: '8px 16px',
            background: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
