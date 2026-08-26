import React from 'react';
import { theme } from '../theme.js';
import { useApp } from '../App.jsx';

export default function ShiftGuard({ onDismiss }) {
  const { setPage } = useApp();
  return (
    <div style={{
      background: `${theme.coral}10`, border: `2px solid ${theme.coral}`,
      borderRadius: 12, padding: '20px 24px',
    }}>
      <div style={{ fontSize: 16, fontWeight: 800, color: theme.coral, marginBottom: 8 }}>
        ⚠️ Aucun shift ouvert
      </div>
      <div style={{ fontSize: 13, color: theme.dark, marginBottom: 16, lineHeight: 1.5 }}>
        Un shift doit être ouvert avant d'enregistrer un paiement.
        Ouvrez un shift dans la section Shifts.
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <button
          onClick={() => setPage('shifts')}
          style={{
            background: theme.teal, color: theme.white, borderRadius: 8,
            padding: '9px 18px', border: 'none', fontWeight: 700, fontSize: 13,
            fontFamily: theme.font, cursor: 'pointer',
          }}
        >Ouvrir un Shift →</button>
        {onDismiss && (
          <button
            onClick={onDismiss}
            style={{
              background: 'rgba(31,42,46,0.07)', color: theme.dark, borderRadius: 8,
              padding: '9px 16px', border: 'none', fontWeight: 500, fontSize: 13,
              fontFamily: theme.font, cursor: 'pointer',
            }}
          >Annuler</button>
        )}
      </div>
    </div>
  );
}
