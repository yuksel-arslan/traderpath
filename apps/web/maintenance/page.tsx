// apps/web/pages/maintenance.tsx
export default function MaintenancePage() {
  return (
    <div style={{ backgroundColor: '#000', color: '#fff', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }}>
      <div style={{ textAlign: 'center', border: '1px solid #40E0D0', padding: '50px', borderRadius: '12px' }}>
        <h1 style={{ fontSize: '48px', fontWeight: '300', color: '#40E0D0' }}>MAINTENANCE</h1>
        <p style={{ color: '#888' }}>We are upgrading our AI systems. Back online soon.</p>
        <div style={{ marginTop: '20px', padding: '10px', background: 'rgba(64,224,208,0.1)', color: '#40E0D0', borderRadius: '4px' }}>
          ETA: ~2 Hours
        </div>
      </div>
    </div>
  );
}
