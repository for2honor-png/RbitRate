import { useState, useEffect } from 'react';
import { api } from '../api';
import { C } from '../theme';
import { getResolvedPermissions } from '../auth';

const ROLE_COLOR = { admin: C.coral, manager: C.saffron, receptionist: C.teal };

export default function Login({ ctx }) {
  const [staff,    setStaff]    = useState([]);
  const [selected, setSelected] = useState(null);
  const [pin,      setPin]      = useState('');
  const [error,    setError]    = useState('');
  const [shake,    setShake]    = useState(false);
  const [props,    setProps]    = useState([]);
  const [pickProp, setPickProp] = useState(false);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    api.getStaff()
      .then(s => setStaff(Array.isArray(s) ? s : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const selectMember = (s) => { setSelected(s); setPin(''); setError(''); };

  const addDigit = (d) => {
    if (pin.length >= 4) return;
    const next = pin + d;
    setPin(next);
    if (next.length === 4) {
      if (next === selected.pin_code) {
        onSuccess();
      } else {
        setShake(true);
        setError('PIN incorrect');
        setTimeout(() => { setShake(false); setPin(''); setError(''); }, 800);
      }
    }
  };

  const onSuccess = async () => {
    const properties = await api.getProperties().catch(() => []);
    if (properties.length === 1) {
      commit(properties[0]);
    } else {
      setProps(properties);
      setPickProp(true);
    }
  };

  const commit = (prop) => {
    const perms = getResolvedPermissions(selected);
    localStorage.setItem('rbitrate_staff', JSON.stringify(selected));
    localStorage.setItem('rbitrate_property', JSON.stringify(prop));
    localStorage.setItem('rbitrate_permissions', JSON.stringify(perms));
    ctx.setStaff(selected);
    ctx.setProperty(prop);
    ctx.navigate('dashboard');
  };

  if (pickProp) return (
    <div style={{ padding: 24, paddingTop: 48 }}>
      <div style={{ fontSize: 18, fontWeight: 800, color: C.dark, marginBottom: 20 }}>Choisir un établissement</div>
      {props.map(p => (
        <button key={p.id} onClick={() => commit(p)} style={{
          width: '100%', padding: 16, marginBottom: 12, background: C.white,
          border: `1px solid ${C.border}`, borderRadius: 12,
          textAlign: 'left', fontSize: 15, fontWeight: 600, color: C.dark,
        }}>{p.display_name}</button>
      ))}
    </div>
  );

  return (
    <div style={{
      minHeight: '100vh', background: C.dark,
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '48px 24px 32px',
    }}>
      {/* Logo */}
      <div style={{ textAlign: 'center', marginBottom: 36 }}>
        <div style={{ fontSize: 48, marginBottom: 10 }}>🏨</div>
        <div style={{ color: C.cream, fontSize: 26, fontWeight: 900, letterSpacing: -.5 }}>RbitRate</div>
        <div style={{ color: '#94a3b8', fontSize: 13, marginTop: 4 }}>Système de gestion hôtelière</div>
      </div>

      {loading && <div style={{ color: '#94a3b8', fontSize: 14 }}>Chargement des profils...</div>}

      {!selected && !loading && (
        <div style={{ width: '100%' }}>
          <div style={{ color: '#64748b', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14 }}>
            Sélectionner un profil
          </div>
          {staff.map(s => {
            const initials = s.full_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
            const color = ROLE_COLOR[s.role] || C.gray;
            return (
              <button key={s.id} onClick={() => selectMember(s)} style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 14,
                padding: '14px 16px', marginBottom: 10,
                background: '#2a3840', borderRadius: 12,
              }}>
                <div style={{
                  width: 46, height: 46, borderRadius: 23, background: color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 16, fontWeight: 800, color: C.white, flexShrink: 0,
                }}>{initials}</div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ color: C.cream, fontWeight: 700, fontSize: 15 }}>{s.full_name}</div>
                  <div style={{ color: '#94a3b8', fontSize: 12, textTransform: 'capitalize', marginTop: 2 }}>{s.role}</div>
                </div>
                <span style={{ marginLeft: 'auto', color: '#4a5568', fontSize: 18 }}>›</span>
              </button>
            );
          })}
        </div>
      )}

      {selected && (
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <button onClick={() => setSelected(null)} style={{
            alignSelf: 'flex-start', background: 'none', color: '#94a3b8', fontSize: 14, padding: '0 0 20px',
          }}>← Retour</button>

          <div style={{ fontSize: 15, color: C.cream, fontWeight: 700, marginBottom: 28 }}>
            PIN — {selected.full_name}
          </div>

          {/* Dots */}
          <div style={{ display: 'flex', gap: 18, marginBottom: 8, animation: shake ? 'shake .4s' : 'none' }}>
            {[0,1,2,3].map(i => (
              <div key={i} style={{
                width: 18, height: 18, borderRadius: 9,
                background: i < pin.length ? C.teal : 'transparent',
                border: `2px solid ${i < pin.length ? C.teal : '#4a5568'}`,
                transition: 'all .12s',
              }} />
            ))}
          </div>

          {error && (
            <div style={{ color: C.coral, fontSize: 13, marginBottom: 8, height: 20 }}>{error}</div>
          )}
          {!error && <div style={{ height: 28 }} />}

          {/* PIN pad */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, width: '100%',
          }}>
            {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((d, i) => (
              <button key={i} onClick={() => {
                if (!d) return;
                if (d === '⌫') { setPin(p => p.slice(0, -1)); return; }
                addDigit(d);
              }} style={{
                height: 68, borderRadius: 14, fontSize: 24, fontWeight: 700,
                background: d ? '#2a3840' : 'transparent',
                color: d === '⌫' ? C.coral : C.cream,
                opacity: d ? 1 : 0,
                transition: 'background .1s',
              }}>{d}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
