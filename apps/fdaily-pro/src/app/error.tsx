'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: '#0a0a0a',
      color: '#fafafa'
    }}>
      <h1 style={{ fontSize: '4rem', fontWeight: 'bold', color: '#666' }}>Error</h1>
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
    </div>
  );
}
