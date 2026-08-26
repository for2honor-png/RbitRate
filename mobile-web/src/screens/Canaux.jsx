import { useState } from 'react';
import { C } from '../theme';

const BASE_URL = 'https://rbitrate.vercel.app/api/ical';

export default function Canaux({ ctx }) {
  const { property } = ctx;
  const [copied, setCopied] = useState(null);

  const propertyId = property?.id || '';
  const icalUrl = propertyId ? `${BASE_URL}?p=${propertyId}` : null;

  function copyToClipboard(text, key) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 2200);
    });
  }

  return (
    <div style={{ padding: '20px 16px', maxWidth: 480, margin: '0 auto' }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: C.dark, margin: '0 0 4px' }}>
        Canaux OTA
      </h2>
      <p style={{ fontSize: 13, color: C.gray, marginBottom: 24 }}>
        Synchronisez votre calendrier avec Airbnb, Booking.com et d'autres plateformes.
      </p>

      {!propertyId && (
        <div style={{
          background: '#fef3c7', border: '1px solid #f59e0b', borderRadius: 10,
          padding: '12px 16px', fontSize: 13, color: '#92400e',
        }}>
          Aucune propriété sélectionnée. Connectez-vous avec votre compte.
        </div>
      )}

      {propertyId && (
        <>
          {/* iCal URL card */}
          <div style={{
            background: C.white, border: `1px solid ${C.border}`,
            borderRadius: 14, padding: '16px', marginBottom: 16,
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <span style={{ fontSize: 22 }}>📅</span>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.dark }}>
                  URL d'export iCal
                </div>
                <div style={{ fontSize: 12, color: C.gray }}>
                  À coller dans Airbnb, Booking.com, Google Calendar…
                </div>
              </div>
            </div>

            <div style={{
              background: '#f8f7f4', border: `1px solid ${C.border}`,
              borderRadius: 8, padding: '10px 12px',
              fontSize: 11, color: C.dark, fontFamily: 'monospace',
              wordBreak: 'break-all', lineHeight: 1.6,
              marginBottom: 10,
            }}>
              {icalUrl}
            </div>

            <button
              onClick={() => copyToClipboard(icalUrl, 'ical')}
              style={{
                width: '100%', padding: '11px', borderRadius: 9,
                background: copied === 'ical' ? '#16a34a' : C.teal,
                color: '#fff', border: 'none', fontWeight: 700,
                fontSize: 14, cursor: 'pointer', transition: 'background .2s',
              }}
            >
              {copied === 'ical' ? '✓ Copié !' : '📋 Copier le lien iCal'}
            </button>
          </div>

          {/* Platform guides */}
          <PlatformCard
            icon="🏠"
            name="Airbnb"
            color="#FF5A5F"
            steps={[
              'Gérer les annonces → sélectionner l\'annonce',
              'Calendrier → Paramètres → Synchronisation du calendrier',
              'Importer le calendrier → coller l\'URL ci-dessus',
            ]}
            url={icalUrl}
            onCopy={() => copyToClipboard(icalUrl, 'airbnb')}
            copied={copied === 'airbnb'}
          />

          <PlatformCard
            icon="🔵"
            name="Booking.com"
            color="#003580"
            steps={[
              'Extranet → Propriété → Synchronisation du calendrier',
              'Exporter les réservations → Ajouter un nouveau lien',
              'Coller l\'URL iCal et enregistrer',
            ]}
            url={icalUrl}
            onCopy={() => copyToClipboard(icalUrl, 'booking')}
            copied={copied === 'booking'}
          />

          <PlatformCard
            icon="🟢"
            name="Google Calendar"
            color="#1a73e8"
            steps={[
              'Paramètres → Ajouter un agenda',
              'Depuis l\'URL → coller le lien iCal',
              'Le calendrier se met à jour toutes les heures',
            ]}
            url={icalUrl}
            onCopy={() => copyToClipboard(icalUrl, 'gcal')}
            copied={copied === 'gcal'}
          />

          <div style={{
            background: '#f0fdf4', border: '1px solid #bbf7d0',
            borderRadius: 10, padding: '12px 14px',
            fontSize: 12, color: '#15803d', marginTop: 8,
          }}>
            Le calendrier se synchronise en temps réel depuis votre base de données.
            Les réservations annulées et les check-outs passés sont automatiquement exclus.
          </div>
        </>
      )}
    </div>
  );
}

function PlatformCard({ icon, name, color, steps, url, onCopy, copied }) {
  const [open, setOpen] = useState(false);

  return (
    <div style={{
      background: C.white, border: `1px solid ${C.border}`,
      borderRadius: 14, marginBottom: 10, overflow: 'hidden',
      boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
    }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 12,
          padding: '14px 16px', background: 'none', border: 'none',
          cursor: 'pointer', textAlign: 'left',
        }}
      >
        <span style={{ fontSize: 24 }}>{icon}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.dark }}>{name}</div>
          <div style={{ fontSize: 12, color: C.gray }}>Guide d'intégration →</div>
        </div>
        <span style={{ fontSize: 18, color: C.gray, transform: open ? 'rotate(90deg)' : 'none', transition: '.2s' }}>›</span>
      </button>

      {open && (
        <div style={{ borderTop: `1px solid ${C.border}`, padding: '12px 16px 14px' }}>
          <ol style={{ margin: '0 0 12px', paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {steps.map((s, i) => (
              <li key={i} style={{ fontSize: 13, color: C.dark, lineHeight: 1.5 }}>{s}</li>
            ))}
          </ol>
          <button
            onClick={onCopy}
            style={{
              width: '100%', padding: '10px', borderRadius: 8,
              background: copied ? '#16a34a' : color,
              color: '#fff', border: 'none', fontWeight: 600,
              fontSize: 13, cursor: 'pointer', transition: 'background .2s',
            }}
          >
            {copied ? '✓ Copié !' : '📋 Copier le lien pour ' + name}
          </button>
        </div>
      )}
    </div>
  );
}
