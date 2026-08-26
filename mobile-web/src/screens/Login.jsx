import React, { useState, useEffect, useRef } from 'react';
import { theme } from '../theme.js';
import { useAuth } from '../App.jsx';
import { invoke } from '../db.js';

export default function Login() {
  const { login } = useAuth();
  const [staffList, setStaffList] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [pin, setPin] = useState(['', '', '', '']);
  const [error, setError] = useState('');
  const [shake, setShake] = useState(false);
  const pinRefs = [useRef(), useRef(), useRef(), useRef()];

  useEffect(() => {
    invoke('staff:getAll', {}).then(list => {
      if (!Array.isArray(list)) return;
      setStaffList(list);
      if (list.length > 0) setSelectedId(list[0].id);
    });
  }, []);

  function handlePinChange(index, value) {
    const digit = value.replace(/\D/g, '').slice(-1);
    const next = [...pin];
    next[index] = digit;
    setPin(next);
    setError('');
    if (digit && index < 3) {
      pinRefs[index + 1].current?.focus();
    }
    if (next.every(d => d !== '')) {
      submitPin(next.join(''));
    }
  }

  function handlePinKeyDown(index, e) {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      pinRefs[index - 1].current?.focus();
    }
  }

  async function submitPin(code) {
    const member = staffList.find(s => s.id === selectedId);
    if (member && (member.pin_code === code || member.pin === code)) {
      login(member);
    } else {
      setError('PIN incorrect. Veuillez réessayer.');
      setShake(true);
      setPin(['', '', '', '']);
      setTimeout(() => { setShake(false); pinRefs[0].current?.focus(); }, 600);
    }
  }

  const shakeStyle = shake ? {
    animation: 'shake 0.5s ease',
  } : {};

  return (
    <div style={{
      height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: theme.cream, fontFamily: theme.font,
    }}>
      <style>{`
        @keyframes shake {
          0%,100% { transform: translateX(0); }
          20%      { transform: translateX(-8px); }
          40%      { transform: translateX(8px); }
          60%      { transform: translateX(-6px); }
          80%      { transform: translateX(6px); }
        }
      `}</style>

      <div style={{
        background: theme.white, borderRadius: 20, padding: '40px 48px',
        width: 400, boxShadow: '0 8px 48px rgba(31,42,46,0.12)',
        ...shakeStyle,
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 32, fontWeight: 900, color: theme.dark, letterSpacing: -1 }}>
            <span style={{ color: theme.teal }}>R</span>bitRate
          </div>
          <div style={{ fontSize: 13, color: theme.dark, opacity: 0.5, marginTop: 4 }}>
            Système de gestion hôtelière
          </div>
        </div>

        {/* Staff selector */}
        <div style={{ marginBottom: 24 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: theme.dark, opacity: 0.6, marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Membre du personnel
          </label>
          <select
            value={selectedId}
            onChange={e => { setSelectedId(e.target.value); setPin(['', '', '', '']); setError(''); pinRefs[0].current?.focus(); }}
            style={{
              width: '100%', border: `1.5px solid rgba(31,42,46,0.2)`, borderRadius: 8,
              padding: '9px 12px', fontSize: 14, fontFamily: theme.font,
              background: theme.white, color: theme.dark, outline: 'none', cursor: 'pointer',
            }}
          >
            {staffList.map(s => (
              <option key={s.id} value={s.id}>{s.full_name} — {s.role}</option>
            ))}
          </select>
        </div>

        {/* PIN input */}
        <div style={{ marginBottom: 24 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: theme.dark, opacity: 0.6, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Code PIN
          </label>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            {pin.map((digit, i) => (
              <input
                key={i}
                ref={pinRefs[i]}
                type="password"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={e => handlePinChange(i, e.target.value)}
                onKeyDown={e => handlePinKeyDown(i, e)}
                onFocus={e => e.target.select()}
                style={{
                  width: 56, height: 64, textAlign: 'center', fontSize: 28, fontWeight: 700,
                  border: `1.5px solid ${digit ? theme.teal : 'rgba(31,42,46,0.2)'}`,
                  borderRadius: 10, outline: 'none', fontFamily: theme.font,
                  color: theme.dark, background: theme.cream,
                  transition: 'border-color 0.15s',
                }}
                autoFocus={i === 0}
              />
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            textAlign: 'center', color: theme.coral, fontSize: 13,
            fontWeight: 600, marginBottom: 16,
            padding: '8px 12px', background: 'rgba(255,127,80,0.08)',
            borderRadius: 8,
          }}>
            {error}
          </div>
        )}

        {/* Submit */}
        <button
          onClick={() => pin.every(d => d) && submitPin(pin.join(''))}
          style={{
            width: '100%', background: theme.teal, color: theme.white,
            borderRadius: 8, padding: '12px 20px', border: 'none',
            fontWeight: 700, fontSize: 15, fontFamily: theme.font,
            cursor: 'pointer', letterSpacing: 0.5,
          }}
        >
          Connexion
        </button>
      </div>
    </div>
  );
}
