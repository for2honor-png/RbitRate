import { useState, useEffect, useCallback } from 'react';
import { api } from '../api';
import { C } from '../theme';

export default function Dashboard({ ctx }) {
  const { staff, property, logout, navigate } = ctx;
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!property?.id) return;
    setLoading(true);
    try {
      const d = await api.getDashboard(property.id);
      setData(d);
    } catch { /* stay with stale data */ }
    setLoading(false);
  }, [property?.id]);

  useEffect(() => { load(); }, [load]);

  const rooms      = data?.rooms || [];
  const total      = rooms.length;
  const occupied   = rooms.filter(r => r.status === 'occupied').length;
  const available  = rooms.filter(r => r.status === 'available').length;
  const cleaning   = rooms.filter(r => r.status === 'cleaning').length;
  const maintenance = rooms.filter(r => r.status === 'maintenance').length;

  return (
    <div style={{ padding: '20px 16px 8px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 900, color: C.dark }}>
            Bonjour, {staff?.full_name?.split(' ')[0]} 👋
          </div>
          <div style={{ fontSize: 13, color: C.gray, marginTop: 2 }}>{property?.display_name}</div>
        </div>
        <button onClick={logout} style={{
          background: 'none', color: C.gray, fontSize: 12, fontWeight: 600,
          padding: '8px 0', minHeight: 0,
        }}>Déconnexion</button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', color: C.gray, padding: '40px 0' }}>Chargement...</div>
      ) : (
        <>
          {/* KPI cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
            {[
              { label: 'Occupées',  value: occupied,           color: C.coral },
              { label: 'Libres',    value: available,          color: C.teal },
              { label: 'Arrivées',  value: data?.arrivals || 0, color: C.saffron },
            ].map(s => (
              <div key={s.label} style={{
                background: C.white, borderRadius: 12, padding: '14px 10px',
                textAlign: 'center', borderTop: `3px solid ${s.color}`,
                boxShadow: '0 1px 4px rgba(0,0,0,.06)',
              }}>
                <div style={{ fontSize: 24, fontWeight: 900, color: C.dark }}>{s.value}</div>
                <div style={{ fontSize: 11, color: C.gray, marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Room breakdown + quick actions — side by side on desktop */}
          <div className={total > 0 ? 'dash-panels' : undefined}>
            {total > 0 && (
              <div style={{
                background: C.white, borderRadius: 12, padding: 16, marginBottom: 16,
                boxShadow: '0 1px 4px rgba(0,0,0,.06)',
              }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.gray, textTransform: 'uppercase', letterSpacing: .5, marginBottom: 10 }}>
                  Chambres — {total} total
                </div>
                {[
                  { label: 'Disponibles',  count: available,   color: C.teal },
                  { label: 'Occupées',     count: occupied,    color: C.coral },
                  { label: 'Nettoyage',    count: cleaning,    color: C.saffron },
                  { label: 'Maintenance',  count: maintenance, color: C.gray },
                ].filter(s => s.count > 0).map((s, i, arr) => (
                  <div key={s.label} style={{
                    display: 'flex', alignItems: 'center', padding: '9px 0',
                    borderBottom: i < arr.length - 1 ? `1px solid ${C.border}` : 'none',
                  }}>
                    <div style={{ width: 8, height: 8, borderRadius: 4, background: s.color, marginRight: 10, flexShrink: 0 }} />
                    <div style={{ flex: 1, color: C.dark, fontSize: 14 }}>{s.label}</div>
                    <div style={{ fontWeight: 800, fontSize: 16, color: s.color }}>{s.count}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Quick actions */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.gray, textTransform: 'uppercase', letterSpacing: .5, marginBottom: 10 }}>
                Actions rapides
              </div>
              <div className="dash-actions">
                {[
                  { label: 'Check-in',  icon: '✚',  path: 'checkin', bg: C.teal },
                  { label: 'Chambres',  icon: '🛏', path: 'rooms',   bg: '#2a3840' },
                  { label: 'Clients',   icon: '👥', path: 'guests',  bg: '#2a3840' },
                  { label: 'Mon Shift', icon: '⏱',  path: 'shifts',  bg: '#2a3840' },
                ].map(a => (
                  <button key={a.path} onClick={() => navigate(a.path)} style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    justifyContent: 'center', padding: '18px 0', borderRadius: 12,
                    background: a.bg, gap: 6,
                  }}>
                    <span style={{ fontSize: 24 }}>{a.icon}</span>
                    <span style={{ color: C.white, fontWeight: 700, fontSize: 13 }}>{a.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
