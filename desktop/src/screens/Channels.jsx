import React, { useState, useEffect, useCallback, useRef } from 'react';
import { theme } from '../theme.js';
import { useApp } from '../App.jsx';
import Modal from '../components/Modal.jsx';

const btnBase = {
  background: 'rgba(31,42,46,0.07)', color: theme.dark, borderRadius: 8,
  padding: '8px 14px', border: 'none', fontWeight: 600, fontSize: 13,
  fontFamily: theme.font, cursor: 'pointer',
};

const OTA_COLORS = {
  'Airbnb':       '#FF5A5F',
  'Booking.com':  '#003580',
  'VRBO':         '#1F3A5F',
  'Expedia':      '#f8a000',
  'Direct':       theme.teal,
  '__rbitrate':   '#1f2a2e',
};

const OTA_PRESETS = ['Airbnb', 'Booking.com', 'VRBO', 'Expedia'];

function otaColor(name) {
  return OTA_COLORS[name] || '#6b7280';
}

function fmtRelTime(iso) {
  if (!iso) return 'Jamais';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'À l\'instant';
  if (m < 60) return `il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `il y a ${h}h`;
  return `il y a ${Math.floor(h / 24)}j`;
}

function StatusBadge({ status }) {
  const map = {
    ok:        { dot: '#22c55e', label: 'Synchronisé' },
    error:     { dot: theme.coral, label: 'Erreur' },
    pending:   { dot: '#f59e0b', label: 'En attente' },
    activating:{ dot: '#f59e0b', label: 'Activation' },
  };
  const s = map[status] || map.pending;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600 }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.dot, display: 'inline-block' }} />
      <span style={{ color: theme.dark, opacity: 0.7 }}>{s.label}</span>
    </div>
  );
}

// ── OTA Edit Modal ────────────────────────────────────────────────────────

function OtaModal({ ota, propertyId, onSave, onClose }) {
  const isEdit = !!ota?.id;
  const [name, setName]           = useState(ota?.name || 'Airbnb');
  const [customName, setCustomName] = useState('');
  const [importUrl, setImportUrl]   = useState(ota?.import_url || '');
  const [testing, setTesting]       = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [saving, setSaving]         = useState(false);

  const resolvedName = name === '__custom' ? customName : name;

  async function handleTest() {
    if (!importUrl.trim()) return;
    setTesting(true);
    setTestResult(null);
    const result = await window.db.invoke('channels:testURL', { url: importUrl.trim() });
    setTesting(false);
    setTestResult(result);
  }

  async function handleSave() {
    if (!resolvedName || !importUrl.trim()) return;
    setSaving(true);
    await window.db.invoke('channels:saveOTA', {
      property_id: propertyId,
      ota: {
        ...(ota?.id ? { id: ota.id } : {}),
        name: resolvedName,
        import_url: importUrl.trim(),
      },
    });
    setSaving(false);
    onSave();
  }

  return (
    <Modal title={isEdit ? `Modifier ${ota.name}` : 'Ajouter une plateforme OTA'} onClose={onClose} width={480}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

        {!isEdit && (
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, opacity: 0.5, textTransform: 'uppercase', marginBottom: 8 }}>
              Plateforme
            </label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {[...OTA_PRESETS, '__custom'].map(p => (
                <button key={p} onClick={() => setName(p)} style={{
                  padding: '6px 12px', borderRadius: 7, border: 'none', cursor: 'pointer',
                  fontWeight: 600, fontSize: 12, fontFamily: theme.font,
                  background: name === p ? theme.dark : 'rgba(31,42,46,0.07)',
                  color: name === p ? theme.white : theme.dark,
                }}>{p === '__custom' ? 'Autre…' : p}</button>
              ))}
            </div>
            {name === '__custom' && (
              <input
                placeholder="Nom de la plateforme"
                value={customName}
                onChange={e => setCustomName(e.target.value)}
                style={{ marginTop: 8, width: '100%', border: '1.5px solid rgba(31,42,46,0.2)', borderRadius: 8, padding: '8px 12px', fontSize: 13, fontFamily: theme.font, outline: 'none', boxSizing: 'border-box' }}
              />
            )}
          </div>
        )}

        <div>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, opacity: 0.5, textTransform: 'uppercase', marginBottom: 6 }}>
            URL d'import iCal <span style={{ fontWeight: 400, textTransform: 'none', fontSize: 11 }}>(de la plateforme vers RbitRate)</span>
          </label>
          <div style={{ position: 'relative' }}>
            <input
              placeholder="https://www.airbnb.com/calendar/ical/..."
              value={importUrl}
              onChange={e => { setImportUrl(e.target.value); setTestResult(null); }}
              style={{ width: '100%', border: '1.5px solid rgba(31,42,46,0.2)', borderRadius: 8, padding: '9px 12px', fontSize: 13, fontFamily: theme.font, outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ fontSize: 11, color: theme.dark, opacity: 0.45, marginTop: 4 }}>
            ℹ Trouvez cette URL dans les paramètres calendrier de la plateforme
          </div>

          <button onClick={handleTest} disabled={testing || !importUrl.trim()} style={{
            marginTop: 8, padding: '7px 14px', borderRadius: 7, border: 'none',
            fontWeight: 600, fontSize: 12, fontFamily: theme.font, cursor: 'pointer',
            background: 'rgba(31,42,46,0.07)', color: theme.dark,
            opacity: (!importUrl.trim() || testing) ? 0.5 : 1,
          }}>{testing ? '⏳ Test...' : '🔍 Tester l\'URL'}</button>

          {testResult && (
            <div style={{
              marginTop: 8, padding: '8px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600,
              background: testResult.ok ? '#f0fdf4' : '#fef2f2',
              color: testResult.ok ? '#16a34a' : theme.coral,
              border: `1px solid ${testResult.ok ? '#86efac' : '#fca5a5'}`,
            }}>
              {testResult.ok
                ? `✓ ${testResult.eventCount} événements trouvés — URL valide`
                : `✗ ${testResult.error}`}
            </div>
          )}
        </div>

        <div style={{ borderTop: '1px solid rgba(31,42,46,0.08)', paddingTop: 12, fontSize: 12, color: theme.dark, opacity: 0.55 }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>Export vers la plateforme</div>
          <div style={{ lineHeight: 1.6 }}>
            Utilisez le bouton <strong>"Télécharger export .ics"</strong> dans la liste des connexions
            pour générer un fichier .ics à importer manuellement dans votre compte OTA.
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 4 }}>
          <button onClick={onClose} style={{
            padding: '9px 18px', borderRadius: 8, border: 'none', fontWeight: 600, fontSize: 13,
            fontFamily: theme.font, cursor: 'pointer', background: 'rgba(31,42,46,0.07)', color: theme.dark,
          }}>Annuler</button>
          <button onClick={handleSave} disabled={saving || !resolvedName || !importUrl.trim()} style={{
            padding: '9px 20px', borderRadius: 8, border: 'none', fontWeight: 700, fontSize: 13,
            fontFamily: theme.font, cursor: 'pointer',
            background: theme.teal, color: theme.white,
            opacity: (saving || !resolvedName || !importUrl.trim()) ? 0.6 : 1,
          }}>{saving ? '...' : (isEdit ? 'Enregistrer' : 'Ajouter et synchroniser')}</button>
        </div>
      </div>
    </Modal>
  );
}

// ── Calendar View ────────────────────────────────────────────────────────

const DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const MONTHS_FR = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

function CalendarDay({ date, otaBlocks, reservations, isToday, isPast, onClick }) {
  const dayStr = date.toISOString().split('T')[0];

  const events = [
    ...otaBlocks.filter(b => b.start_date <= dayStr && b.end_date >= dayStr).map(b => ({
      type: 'ota', label: b.source_name, color: otaColor(b.source_name), title: b.summary || b.source_name,
    })),
    ...reservations.filter(r => r.check_in_date <= dayStr && r.check_out_date > dayStr).map(r => ({
      type: 'res', label: `${r.last_name || ''} — Ch.${r.room_number}`, color: otaColor('__rbitrate'),
      title: `${r.last_name} ${r.first_name} — Ch.${r.room_number}`,
    })),
  ];

  return (
    <div
      onClick={() => onClick && onClick(date, events)}
      style={{
        minHeight: 72, background: isPast ? 'rgba(31,42,46,0.03)' : theme.white,
        border: `1px solid rgba(31,42,46,0.07)`,
        borderRadius: 6, padding: '4px 5px', cursor: events.length ? 'pointer' : 'default',
        outline: isToday ? `2px solid ${theme.teal}` : 'none',
        outlineOffset: -2,
      }}
    >
      <div style={{
        fontSize: 11, fontWeight: isToday ? 900 : 500,
        color: isToday ? theme.teal : isPast ? 'rgba(31,42,46,0.3)' : theme.dark,
        marginBottom: 3,
      }}>{date.getDate()}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {events.slice(0, 3).map((ev, i) => (
          <div key={i} style={{
            background: ev.color, borderRadius: 3, padding: '1px 4px',
            fontSize: 9, fontWeight: 700, color: '#fff', overflow: 'hidden',
            textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{ev.label}</div>
        ))}
        {events.length > 3 && (
          <div style={{ fontSize: 9, color: theme.dark, opacity: 0.4 }}>+{events.length - 3}</div>
        )}
      </div>
    </div>
  );
}

function CalendarView({ propertyId, otas }) {
  const today = new Date();
  const [year, setYear]   = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [calData, setCalData] = useState({ otaBlocks: [], reservations: [] });
  const [syncing, setSyncing] = useState(false);
  const [dayPopover, setDayPopover] = useState(null); // { date, events }

  const load = useCallback(async () => {
    if (!propertyId) return;
    const data = await window.db.invoke('channels:getCalendar', { property_id: propertyId, year, month });
    setCalData(data || { otaBlocks: [], reservations: [] });
  }, [propertyId, year, month]);

  useEffect(() => { load(); }, [load]);

  // Listen for auto-sync notifications
  useEffect(() => {
    if (!window.db.on) return;
    const unsub = window.db.on('channels:syncComplete', ({ property_id }) => {
      if (property_id === propertyId) load();
    });
    return () => typeof unsub === 'function' && unsub();
  }, [propertyId, load]);

  function prevMonth() {
    if (month === 1) { setYear(y => y - 1); setMonth(12); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 12) { setYear(y => y + 1); setMonth(1); }
    else setMonth(m => m + 1);
  }

  async function handleSyncAll() {
    if (!propertyId) return;
    setSyncing(true);
    await window.db.invoke('channels:syncAll', { property_id: propertyId });
    await load();
    setSyncing(false);
  }

  // Build calendar grid
  const firstDay = new Date(year, month - 1, 1);
  const lastDay  = new Date(year, month, 0);
  // Mon=0 offset
  const startOffset = (firstDay.getDay() + 6) % 7;
  const totalCells  = Math.ceil((startOffset + lastDay.getDate()) / 7) * 7;

  const cells = [];
  for (let i = 0; i < totalCells; i++) {
    const dayNum = i - startOffset + 1;
    if (dayNum < 1 || dayNum > lastDay.getDate()) {
      cells.push(null);
    } else {
      cells.push(new Date(year, month - 1, dayNum));
    }
  }

  const todayStr = today.toISOString().split('T')[0];

  // Unique OTAs present
  const presentOtas = [...new Set(calData.otaBlocks.map(b => b.source_name))];

  return (
    <div>
      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={prevMonth} style={{ ...btnBase }}>‹</button>
          <div style={{ fontSize: 15, fontWeight: 800, color: theme.dark, minWidth: 160, textAlign: 'center' }}>
            {MONTHS_FR[month - 1]} {year}
          </div>
          <button onClick={nextMonth} style={{ ...btnBase }}>›</button>
          <button onClick={() => { setYear(today.getFullYear()); setMonth(today.getMonth() + 1); }} style={{ ...btnBase, fontSize: 11 }}>
            Aujourd'hui
          </button>
        </div>
        <div style={{ flex: 1 }} />
        <button onClick={handleSyncAll} disabled={syncing} style={{
          ...btnBase, background: theme.teal, color: theme.white,
          opacity: syncing ? 0.7 : 1, fontWeight: 700,
        }}>{syncing ? '⏳ Sync...' : '🔄 Synchroniser tout'}</button>
      </div>

      {/* Legend */}
      {(presentOtas.length > 0 || calData.reservations.length > 0) && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
          {presentOtas.map(name => (
            <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11 }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: otaColor(name) }} />
              <span style={{ color: theme.dark, opacity: 0.7 }}>{name}</span>
            </div>
          ))}
          {calData.reservations.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11 }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: otaColor('__rbitrate') }} />
              <span style={{ color: theme.dark, opacity: 0.7 }}>RbitRate</span>
            </div>
          )}
        </div>
      )}

      {/* Grid header */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 3, marginBottom: 3 }}>
        {DAYS.map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: 10, fontWeight: 700, color: theme.dark, opacity: 0.4, padding: '4px 0' }}>{d}</div>
        ))}
      </div>

      {/* Grid cells */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 3 }}>
        {cells.map((date, i) => date ? (
          <CalendarDay
            key={i}
            date={date}
            otaBlocks={calData.otaBlocks}
            reservations={calData.reservations}
            isToday={date.toISOString().split('T')[0] === todayStr}
            isPast={date.toISOString().split('T')[0] < todayStr}
            onClick={(d, evs) => evs.length && setDayPopover({ date: d, events: evs })}
          />
        ) : (
          <div key={i} style={{ minHeight: 72 }} />
        ))}
      </div>

      {/* Day detail popover */}
      {dayPopover && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.25)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }} onClick={() => setDayPopover(null)}>
          <div onClick={e => e.stopPropagation()} style={{
            background: theme.white, borderRadius: 12, padding: 20, minWidth: 300, maxWidth: 440,
            boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
          }}>
            <div style={{ fontWeight: 800, fontSize: 15, color: theme.dark, marginBottom: 14 }}>
              {dayPopover.date.toLocaleDateString('fr-MA', { day: 'numeric', month: 'long', year: 'numeric' })}
            </div>
            {dayPopover.events.map((ev, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 0', borderBottom: '1px solid rgba(31,42,46,0.06)',
              }}>
                <div style={{ width: 4, alignSelf: 'stretch', borderRadius: 2, background: ev.color, flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: theme.dark }}>{ev.title}</div>
                  <div style={{ fontSize: 11, color: theme.dark, opacity: 0.45, marginTop: 2 }}>
                    {ev.type === 'ota' ? 'Bloc OTA' : 'Réservation RbitRate'}
                  </div>
                </div>
              </div>
            ))}
            <button onClick={() => setDayPopover(null)} style={{
              marginTop: 14, padding: '8px 16px', borderRadius: 8, border: 'none',
              fontWeight: 600, fontSize: 13, fontFamily: theme.font, cursor: 'pointer',
              background: 'rgba(31,42,46,0.07)', color: theme.dark,
            }}>Fermer</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Connections Tab ───────────────────────────────────────────────────────

function ConnectionsTab({ propertyId, otas, onRefresh }) {
  const [editOta, setEditOta]     = useState(null);
  const [showAdd, setShowAdd]     = useState(false);
  const [syncing, setSyncing]     = useState({});
  const [exporting, setExporting] = useState(false);
  const [toast, setToast]         = useState(null);

  function showToast(msg, err) {
    setToast({ msg, err });
    setTimeout(() => setToast(null), 3500);
  }

  async function handleSyncOne(ota) {
    setSyncing(s => ({ ...s, [ota.id]: true }));
    const result = await window.db.invoke('channels:syncOne', { property_id: propertyId, ota_id: ota.id });
    setSyncing(s => ({ ...s, [ota.id]: false }));
    if (result.ok) showToast(`✓ ${ota.name}: +${result.added} nouvelles réservations`);
    else showToast(`Erreur ${ota.name}: ${result.error}`, true);
    onRefresh();
  }

  async function handleRemove(ota) {
    if (!confirm(`Supprimer la connexion ${ota.name} ?`)) return;
    await window.db.invoke('channels:removeOTA', { property_id: propertyId, ota_id: ota.id });
    onRefresh();
  }

  async function handleExport() {
    setExporting(true);
    const result = await window.db.invoke('channels:generateExportFeed', { property_id: propertyId });
    setExporting(false);
    if (result.ok) showToast(`✓ Export .ics enregistré (${result.eventCount} événements)`);
    else showToast('Erreur: ' + result.error, true);
  }

  return (
    <div>
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: toast.err ? theme.coral : '#16a34a', color: '#fff', borderRadius: 10,
          padding: '12px 24px', fontSize: 13, fontWeight: 700, zIndex: 9999,
          boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
        }}>{toast.msg}</div>
      )}

      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: theme.dark, opacity: 0.55 }}>
          {otas.length} connexion{otas.length !== 1 ? 's' : ''} configurée{otas.length !== 1 ? 's' : ''}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={handleExport} disabled={exporting} style={{
            ...btnBase, fontWeight: 600, fontSize: 12, opacity: exporting ? 0.6 : 1,
          }}>📥 {exporting ? 'Export...' : 'Télécharger export .ics'}</button>
          <button onClick={() => setShowAdd(true)} style={{
            ...btnBase, background: theme.teal, color: theme.white, fontWeight: 700,
          }}>+ Ajouter une plateforme</button>
        </div>
      </div>

      {/* OTA cards */}
      {otas.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '48px 24px', background: theme.white,
          borderRadius: 12, border: '1px solid rgba(31,42,46,0.08)',
        }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📡</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: theme.dark, marginBottom: 6 }}>Aucune connexion OTA</div>
          <div style={{ fontSize: 13, color: theme.dark, opacity: 0.5, marginBottom: 20 }}>
            Ajoutez vos canaux Airbnb, Booking.com, VRBO, Expedia pour synchroniser automatiquement vos réservations.
          </div>
          <button onClick={() => setShowAdd(true)} style={{
            ...btnBase, background: theme.teal, color: theme.white, fontWeight: 700, fontSize: 13,
          }}>+ Ajouter une plateforme</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {otas.map(ota => (
            <div key={ota.id} style={{
              background: theme.white, borderRadius: 12, padding: '16px 18px',
              border: '1px solid rgba(31,42,46,0.08)',
              borderLeft: `4px solid ${otaColor(ota.name)}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <div style={{
                      width: 10, height: 10, borderRadius: '50%',
                      background: otaColor(ota.name), flexShrink: 0,
                    }} />
                    <div style={{ fontSize: 15, fontWeight: 800, color: theme.dark }}>{ota.name}</div>
                    <StatusBadge status={ota.status || 'pending'} />
                  </div>
                  <div style={{ fontSize: 11, color: theme.dark, opacity: 0.45, marginBottom: 3, fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {ota.import_url || '— Pas d\'URL configurée'}
                  </div>
                  {ota.last_error && (
                    <div style={{ fontSize: 11, color: theme.coral, marginBottom: 3 }}>⚠ {ota.last_error}</div>
                  )}
                  <div style={{ fontSize: 11, color: theme.dark, opacity: 0.4 }}>
                    Dernière synchro: {fmtRelTime(ota.last_synced)}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button
                    onClick={() => handleSyncOne(ota)}
                    disabled={syncing[ota.id]}
                    style={{ ...btnBase, fontSize: 11, opacity: syncing[ota.id] ? 0.5 : 1 }}
                  >{syncing[ota.id] ? '⏳' : '🔄'} Sync</button>
                  <button onClick={() => setEditOta(ota)} style={{ ...btnBase, fontSize: 11 }}>✏ Modifier</button>
                  <button onClick={() => handleRemove(ota)} style={{ ...btnBase, fontSize: 11, color: theme.coral }}>🗑</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add modal */}
      {showAdd && (
        <OtaModal
          propertyId={propertyId}
          onSave={async () => { setShowAdd(false); onRefresh(); }}
          onClose={() => setShowAdd(false)}
        />
      )}

      {/* Edit modal */}
      {editOta && (
        <OtaModal
          ota={editOta}
          propertyId={propertyId}
          onSave={async () => { setEditOta(null); onRefresh(); }}
          onClose={() => setEditOta(null)}
        />
      )}
    </div>
  );
}

// ── Main Channels Screen ──────────────────────────────────────────────────

export default function Channels() {
  const { selectedPropertyId } = useApp();
  const [tab, setTab]     = useState('calendar');
  const [otas, setOtas]   = useState([]);
  const [syncingAll, setSyncingAll] = useState(false);

  async function loadOtas() {
    if (!selectedPropertyId) return;
    const props = await window.db.invoke('properties:getAll', {});
    const prop  = props.find(p => p.id === selectedPropertyId);
    setOtas(prop ? JSON.parse(prop.otas || '[]') : []);
  }

  useEffect(() => { loadOtas(); }, [selectedPropertyId]);

  if (!selectedPropertyId) {
    return <div style={{ textAlign: 'center', marginTop: 60, opacity: 0.4 }}>Sélectionnez une propriété.</div>;
  }

  return (
    <div style={{ fontFamily: theme.font }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 900, color: theme.dark, margin: 0 }}>Canaux OTA</h1>
        <p style={{ fontSize: 13, color: theme.dark, opacity: 0.5, margin: 0, marginTop: 4 }}>
          Synchronisation iCal — Airbnb · Booking.com · VRBO · Expedia
        </p>
      </div>

      {/* Sub-tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: 'rgba(31,42,46,0.06)', borderRadius: 10, padding: 4, width: 'fit-content' }}>
        {[
          { key: 'calendar',     label: '📅 Calendrier' },
          { key: 'connections',  label: '🔗 Connexions OTA' },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: '7px 18px', borderRadius: 7, border: 'none',
            fontWeight: 600, fontSize: 13, fontFamily: theme.font, cursor: 'pointer',
            background: tab === t.key ? theme.white : 'transparent',
            color: tab === t.key ? theme.dark : 'rgba(31,42,46,0.45)',
            boxShadow: tab === t.key ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
          }}>{t.label}</button>
        ))}
      </div>

      {tab === 'calendar' && (
        <CalendarView propertyId={selectedPropertyId} otas={otas} />
      )}

      {tab === 'connections' && (
        <ConnectionsTab propertyId={selectedPropertyId} otas={otas} onRefresh={loadOtas} />
      )}
    </div>
  );
}
