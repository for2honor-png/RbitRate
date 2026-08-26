import { useState, useEffect, useRef } from 'react';
import { api } from '../api';
import { C } from '../theme';
import { buildFicheHTML } from '../ficheUtils';

export default function Fiche({ ctx, params }) {
  const { navigate } = ctx;
  const resId = params?.get('id');
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [html, setHtml]       = useState('');
  const iframeRef = useRef(null);

  useEffect(() => {
    if (!resId) { setError('ID de réservation manquant'); setLoading(false); return; }
    api.getReservationFiche(resId)
      .then(res => {
        if (!res) throw new Error('Réservation introuvable');
        const propData = res.properties || {};
        setHtml(buildFicheHTML({
          property: {
            display_name_fr: propData.display_name || 'Hôtel TAREK',
            display_name_ar: 'فندق طارق',
            address: propData.address,
            bp: propData.city,
            phone: propData.phone,
            fax: propData.fax || null,
          },
          guest: res.guests || {},
          reservation: { ...res, room_number: res.rooms?.room_number },
        }));
        setLoading(false);
      })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [resId]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{
        padding: '10px 14px', background: C.dark,
        display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0,
      }} className="no-print">
        <button onClick={() => navigate('rooms')} style={{
          color: C.white, background: 'none', fontSize: 22, lineHeight: 1, padding: '2px 6px', border: 'none',
        }}>←</button>
        <span style={{ flex: 1, color: C.white, fontWeight: 700, fontSize: 15 }}>
          Bulletin d'Arrivée
        </span>
        {!loading && !error && (
          <button onClick={() => iframeRef.current?.contentWindow?.print()} style={{
            background: C.teal, color: C.white, padding: '8px 16px', borderRadius: 8,
            fontWeight: 700, fontSize: 14, border: 'none',
          }}>
            🖨️ Imprimer
          </button>
        )}
      </div>

      {loading && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.gray }}>
          Chargement...
        </div>
      )}
      {error && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#e74c3c', padding: 20 }}>
          {error}
        </div>
      )}
      {!loading && !error && (
        <iframe
          ref={iframeRef}
          srcDoc={html}
          style={{ flex: 1, border: 'none', width: '100%' }}
          title="Bulletin d'Arrivée"
        />
      )}
    </div>
  );
}
