export default function NotFound() {
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
      <h1 style={{ fontSize: '4rem', fontWeight: 'bold', color: '#666' }}>404</h1>
      <p style={{ color: '#888' }}>Page not found</p>
      <a href="/" style={{ marginTop: '1rem', color: '#3b82f6' }}>Go home</a>
    </div>
  );
}
