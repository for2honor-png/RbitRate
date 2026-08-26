import React, { useState, useEffect, useRef } from 'react';
import { theme } from '../theme.js';
import { useAuth, useApp } from '../App.jsx';

const SYNC_DOT = {
  idle:    '#94a3b8',
  syncing: '#f59e0b',
  ok:      '#22c55e',
  error:   '#ef4444',
};

export default function TopBar({ navItems }) {
  const { staff } = useAuth();
  const { page } = useApp();

  const [syncStatus,  setSyncStatus]  = useState({ state: 'idle', at: null, error: null });
  const [toast,       setToast]       = useState(null);
  const [showReset,   setShowReset]   = useState(false);
  const toastTimer  = useRef(null);
  const resetTimer  = useRef(null);

  useEffect(() => {
    if (!window.sync) return;
    window.sync.getStatus().then(s => { if (s) setSyncStatus(s); });
    const unsub = window.sync.onStatus(s => { setSyncStatus(s); });
    return unsub;
  }, []);

  function showToast(msg, isError = false) {
    clearTimeout(toastTimer.current);
    setToast({ msg, isError });
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  }

  async function handleSyncClick() {
    if (syncStatus.state === 'syncing') return;
    setShowReset(false);
    showToast('Synchronisation en cours…');
    const result = await window.sync?.now();
    if (!result) return;
    if (result.state === 'ok' || result.state === 'synced') {
      const n = (result.pushed || 0) + (result.pulled || 0);
      showToast(n > 0
        ? `✓ ${n} enregistrement${n > 1 ? 's' : ''} synchronisé${n > 1 ? 's' : ''}`
        : '✓ Déjà à jour');
    } else if (result.state === 'error') {
      showToast(`Erreur sync — clic droit pour réinitialiser`, true);
    }
  }

  async function handleReset() {
    setShowReset(false);
    showToast('Réinitialisation du sync…');
    const result = await window.sync?.reset();
    if (result?.state === 'ok') {
      const n = (result.pushed || 0) + (result.pulled || 0);
      showToast(`✓ Sync réinitialisé · ${n} enregistrement${n > 1 ? 's' : ''}`);
    } else {
      showToast(result?.error ? `Erreur: ${result.error}` : 'Réinitialisation terminée');
    }
  }

  const currentNav = navItems.find(n => n.key === page);

  function initials(name) {
    return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  }

  const dotColor  = SYNC_DOT[syncStatus.state] || SYNC_DOT.idle;
  const lastAt    = syncStatus.at
    ? new Date(syncStatus.at).toLocaleTimeString('fr-MA', { hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <>
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: toast.isError ? '#dc2626' : '#16a34a',
          color: '#fff', borderRadius: 10, padding: '11px 22px',
          fontSize: 13, fontWeight: 700, zIndex: 9999,
          boxShadow: '0 4px 20px rgba(0,0,0,0.22)', fontFamily: theme.font,
          pointerEvents: 'none',
        }}>{toast.msg}</div>
      )}

      <div style={{
        height: 48, background: theme.white, borderBottom: `1px solid rgba(31,42,46,0.1)`,
        display: 'flex', alignItems: 'center', paddingLeft: 24, paddingRight: 20,
        gap: 12, flexShrink: 0,
      }}>
        <div style={{ flex: 1, fontSize: 14, fontWeight: 700, color: theme.dark }}>
          {currentNav?.label || 'Tableau de bord'}
        </div>

        {/* Sync indicator with right-click reset */}
        <div style={{ position: 'relative' }}>
          <div
            onClick={handleSyncClick}
            onContextMenu={e => { e.preventDefault(); setShowReset(v => !v); }}
            title={syncStatus.error
              ? `Erreur: ${syncStatus.error} — Clic droit pour réinitialiser`
              : lastAt ? `Dernière sync: ${lastAt}` : 'Cliquer pour synchroniser'}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              fontSize: 12, color: syncStatus.state === 'error' ? '#dc2626' : theme.dark,
              opacity: syncStatus.state === 'syncing' ? 1 : 0.7,
              cursor: syncStatus.state === 'syncing' ? 'default' : 'pointer',
              userSelect: 'none', fontFamily: theme.font,
            }}
          >
            <span style={{
              width: 8, height: 8, borderRadius: '50%',
              background: dotColor, display: 'inline-block',
              transition: 'background 0.3s',
              boxShadow: syncStatus.state === 'ok' ? `0 0 0 2px ${dotColor}44` : 'none',
            }} />
            <span>
              {syncStatus.state === 'syncing' ? 'Sync…'
                : syncStatus.state === 'error' ? 'Erreur sync'
                : lastAt || 'Sync'}
            </span>
          </div>

          {showReset && (
            <div
              onClick={e => e.stopPropagation()}
              style={{
                position: 'absolute', top: '130%', right: 0, zIndex: 200,
                background: theme.white, border: '1px solid rgba(31,42,46,0.15)',
                borderRadius: 10, boxShadow: '0 8px 24px rgba(31,42,46,0.15)',
                padding: '6px 0', minWidth: 180,
              }}
            >
              <button
                onClick={handleReset}
                style={{
                  display: 'block', width: '100%', padding: '9px 16px', border: 'none',
                  background: 'none', cursor: 'pointer', textAlign: 'left',
                  fontSize: 13, fontFamily: theme.font, color: '#dc2626', fontWeight: 600,
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#fee2e2'}
                onMouseLeave={e => e.currentTarget.style.background = 'none'}
              >
                Réinitialiser le sync
              </button>
              <div style={{ padding: '4px 16px 6px', fontSize: 11, color: theme.dark, opacity: 0.45 }}>
                Force une re-synchronisation complète
              </div>
            </div>
          )}
        </div>

        <div style={{
          width: 30, height: 30, borderRadius: '50%', background: theme.teal,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: theme.white, fontSize: 11, fontWeight: 700,
        }}>
          {initials(staff.full_name)}
        </div>
      </div>
    </>
  );
}
