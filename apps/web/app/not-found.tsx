export default function NotFound() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      <h1 style={{ fontSize: '4rem', fontWeight: 900, color: '#dc2626' }}>404</h1>
      <p style={{ color: '#64748b', marginTop: '0.5rem' }}>Página no encontrada.</p>
      <a href="/" style={{ marginTop: '1.5rem', color: '#dc2626', fontWeight: 600 }}>← Volver al inicio</a>
    </div>
  );
}
