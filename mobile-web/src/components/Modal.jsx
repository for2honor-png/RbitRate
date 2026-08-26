import React, { useEffect } from 'react';
import { theme } from '../theme.js';

export default function Modal({ title, onClose, children, width = 480 }) {
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(31,42,46,0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div style={{
        background: theme.white, borderRadius: 16, padding: 28,
        width, maxWidth: '90vw', maxHeight: '90vh',
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 20px 60px rgba(31,42,46,0.2)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ flex: 1, fontSize: 17, fontWeight: 700, color: theme.dark, margin: 0 }}>
            {title}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(31,42,46,0.06)', border: 'none', borderRadius: 6,
              width: 30, height: 30, cursor: 'pointer', fontSize: 16, color: theme.dark,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            ×
          </button>
        </div>
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {children}
        </div>
      </div>
    </div>
  );
}
