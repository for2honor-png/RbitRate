import { useState, useEffect, useRef, Fragment } from 'react';
import { api } from '../api';
import { C } from '../theme';

const TAG_COLOR  = { regular: C.teal, vip: C.saffron, blacklisted: C.coral };
const TAG_LABEL  = { regular: 'Régulier', vip: 'VIP', blacklisted: '⛔ Liste noire' };
const ROLE_LABELS = { guide: 'Guide', leader: 'Chef de groupe', representative: 'Représentant', other: 'Autre' };
const PURPLE = '#7c3aed';

function AgenciesTab() {
  const [agencies,      setAgencies]      = useState([]);
  const [agencySearch,  setAgencySearch]  = useState('');
  const [expanded,      setExpanded]      = useState(null);
  const [guides,        setGuides]        = useState({});
  const [loading,       setLoading]       = useState(true);

  useEffect(() => {
    api.getAgencies().then(a => { setAgencies(Array.isArray(a) ? a : []); setLoading(false); });
  }, []);

  const filtered = agencySearch.trim()
    ? agencies.filter(a => a.name.toLowerCase().includes(agencySearch.toLowerCase()))
    : agencies;

  async function toggleExpand(agency) {
    const id = agency.id;
    if (expanded === id) { setExpanded(null); return; }
    setExpanded(id);
    if (!guides[id]) {
      const gs = await api.getGuidesByAgency(id).catch(() => []);
      setGuides(g => ({ ...g, [id]: Array.isArray(gs) ? gs : [] }));
    }
  }

  return (
    <div>
      <input value={agencySearch} onChange={e => setAgencySearch(e.target.value)}
        placeholder="Rechercher une agence..."
        style={{
          width: '100%', padding: '12px 16px', borderRadius: 12,
          border: `1px solid ${C.border}`, background: C.white,
          fontSize: 15, color: C.dark, marginBottom: 16, boxSizing: 'border-box',
        }} />

      {loading && <div style={{ textAlign: 'center', color: C.gray, padding: '20px 0' }}>Chargement...</div>}

      {!loading && filtered.length === 0 && (
        <div style={{ textAlign: 'center', color: C.gray, padding: '40px 0' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🏢</div>
          <div style={{ fontWeight: 600 }}>Aucune agence</div>
        </div>
      )}

      {filtered.map(agency => {
        const isOpen = expanded === agency.id;
        return (
          <div key={agency.id} onClick={() => toggleExpand(agency)} style={{
            background: C.white, borderRadius: 12, marginBottom: 10,
            border: `1px solid ${C.border}`, borderLeft: `4px solid ${PURPLE}`,
            overflow: 'hidden', cursor: 'pointer',
            boxShadow: '0 1px 4px rgba(0,0,0,.05)',
          }}>
            <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10, background: `${PURPLE}15`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 20, flexShrink: 0,
              }}>🏢</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, color: C.dark, fontSize: 15 }}>{agency.name}</div>
                {(agency.city || agency.country) && (
                  <div style={{ color: C.gray, fontSize: 12, marginTop: 2 }}>
                    📍 {[agency.city, agency.country].filter(Boolean).join(', ')}
                  </div>
                )}
                {agency.phone && (
                  <div style={{ color: C.gray, fontSize: 12 }}>📞 {agency.phone}</div>
                )}
              </div>
              <span style={{ fontSize: 11, color: C.gray }}>{isOpen ? '▲' : '▼'}</span>
            </div>

            {isOpen && (
              <div onClick={e => e.stopPropagation()} style={{ padding: '0 16px 14px', borderTop: `1px solid ${C.border}` }}>
                <div style={{ paddingTop: 10, fontSize: 11, fontWeight: 700, color: C.gray, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 8 }}>
                  Guides / Responsables
                </div>
                {!guides[agency.id] ? (
                  <div style={{ color: C.gray, fontSize: 13 }}>Chargement...</div>
                ) : guides[agency.id].length === 0 ? (
                  <div style={{ color: C.gray, fontSize: 13 }}>Aucun guide</div>
                ) : (
                  guides[agency.id].map(g => (
                    <div key={g.id} style={{
                      display: 'flex', gap: 10, padding: '8px 0',
                      borderBottom: `1px solid ${C.border}`, alignItems: 'center',
                    }}>
                      <span style={{ fontSize: 16 }}>👤</span>
                      <div style={{ flex: 1 }}>
                        <span style={{ fontWeight: 700, color: C.dark, fontSize: 13 }}>{g.name}</span>
                        <span style={{ fontSize: 11, color: PURPLE, marginLeft: 8 }}>{ROLE_LABELS[g.role] || g.role}</span>
                      </div>
                      {g.phone && <span style={{ fontSize: 12, color: C.gray }}>{g.phone}</span>}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function GuestDetailFields({ g }) {
  return (
    <>
      {[
        ['Date de naissance',  g.date_of_birth],
        ['Lieu de naissance',  g.place_of_birth],
        ['Profession',         g.profession],
        ['Adresse',            g.permanent_address],
        ['Téléphone',          g.phone],
        ['Email',              g.email],
        ['Type document',      g.document_type],
        ['Numéro document',    g.document_number],
        ['Délivré à',          g.document_issued_at],
        ['Date délivrance',    g.document_issued_date],
        ['Séjours',            g.total_stays ? `${g.total_stays} séjour(s)` : '0'],
      ].filter(([, v]) => v).map(([l, v]) => (
        <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${C.border}` }}>
          <span style={{ color: C.gray, fontSize: 12 }}>{l}</span>
          <span style={{ color: C.dark, fontSize: 12, fontWeight: 600, textAlign: 'right', maxWidth: '55%' }}>{v}</span>
        </div>
      ))}
      {g.notes && (
        <div style={{ marginTop: 8, padding: '8px 10px', background: '#fef9ee', borderRadius: 8, fontSize: 12, color: C.dark }}>
          📝 {g.notes}
        </div>
      )}
    </>
  );
}

export default function GuestSearch() {
  const [tab,      setTab]      = useState('guests');
  const [query,    setQuery]    = useState('');
  const [results,  setResults]  = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [expanded, setExpanded] = useState(null);
  const timer = useRef(null);

  useEffect(() => {
    clearTimeout(timer.current);
    if (query.length < 2) { setResults([]); return; }
    setLoading(true);
    timer.current = setTimeout(async () => {
      const r = await api.searchGuests(query).catch(() => []);
      setResults(Array.isArray(r) ? r : []);
      setLoading(false);
    }, 400);
  }, [query]);

  return (
    <div style={{ padding: '20px 16px' }}>
      <div style={{ fontSize: 17, fontWeight: 800, color: C.dark, marginBottom: 16 }}>Clients</div>

      {/* Tab switcher */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {[
          { key: 'guests',   label: '👤 Clients' },
          { key: 'agencies', label: '🏢 Agences' },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            flex: 1, padding: '10px 0', borderRadius: 10, border: 'none', cursor: 'pointer',
            fontWeight: tab === t.key ? 800 : 500, fontSize: 13,
            background: tab === t.key ? (t.key === 'agencies' ? PURPLE : C.teal) : `rgba(31,42,46,0.07)`,
            color: tab === t.key ? C.white : C.dark,
          }}>{t.label}</button>
        ))}
      </div>

      {tab === 'agencies' ? (
        <AgenciesTab />
      ) : (
        <>
          <input
            value={query}
            onChange={e => { setQuery(e.target.value); setExpanded(null); }}
            placeholder="Nom, prénom ou numéro de document..."
            style={{
              width: '100%', padding: '12px 16px', borderRadius: 12,
              border: `1px solid ${C.border}`, background: C.white,
              fontSize: 15, color: C.dark, marginBottom: 16, boxSizing: 'border-box',
            }}
            autoFocus
          />

          {loading && <div style={{ textAlign: 'center', color: C.gray, padding: '20px 0' }}>Recherche...</div>}

          {!loading && query.length >= 2 && results.length === 0 && (
            <div style={{ textAlign: 'center', color: C.gray, padding: '20px 0' }}>Aucun résultat</div>
          )}

          {/* Card list — mobile (<768px) */}
          <div className="clients-cards">
            {results.map(g => {
              const isExp = expanded === g.id;
              const isBlack = g.tag === 'blacklisted';
              return (
                <div key={g.id} onClick={() => setExpanded(isExp ? null : g.id)} style={{
                  background: C.white, borderRadius: 12, marginBottom: 10,
                  border: `1px solid ${C.border}`,
                  borderLeft: isBlack ? `4px solid ${C.coral}` : `4px solid ${C.teal}`,
                  overflow: 'hidden', cursor: 'pointer',
                  boxShadow: '0 1px 4px rgba(0,0,0,.05)',
                }}>
                  <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: 20, flexShrink: 0,
                      background: TAG_COLOR[g.tag] || C.teal,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: C.white, fontWeight: 800, fontSize: 14,
                    }}>
                      {g.last_name?.[0]}{g.first_name?.[0]}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, color: C.dark, fontSize: 15 }}>
                        {g.last_name} {g.first_name}
                      </div>
                      <div style={{ color: C.gray, fontSize: 12, marginTop: 2 }}>
                        {g.nationality || '—'} · {g.document_number || 'Sans document'}
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                      <span style={{
                        fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
                        background: `${TAG_COLOR[g.tag] || C.teal}20`,
                        color: TAG_COLOR[g.tag] || C.teal,
                      }}>{TAG_LABEL[g.tag] || g.tag}</span>
                      <span style={{ fontSize: 10, color: C.gray }}>{isExp ? '▲' : '▼'}</span>
                    </div>
                  </div>

                  {isExp && (
                    <div style={{ padding: '0 16px 16px', borderTop: `1px solid ${C.border}` }}>
                      <div style={{ paddingTop: 12 }}>
                        <GuestDetailFields g={g} />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Table view — desktop (>=768px) */}
          <div className="clients-table" style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', background: C.white, borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,.05)' }}>
              <thead>
                <tr style={{ background: '#f7f5f0', textAlign: 'left' }}>
                  {['Nom', 'Nationalité', 'Document', 'Tag', 'Séjours', ''].map(h => (
                    <th key={h} style={{ padding: '10px 14px', fontSize: 11, fontWeight: 700, color: C.gray, textTransform: 'uppercase', letterSpacing: .4 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {results.map(g => {
                  const isExp = expanded === g.id;
                  return (
                    <Fragment key={g.id}>
                      <tr style={{ borderTop: `1px solid ${C.border}` }}>
                        <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 700, color: C.dark }}>{g.last_name} {g.first_name}</td>
                        <td style={{ padding: '10px 14px', fontSize: 13, color: C.dark }}>{g.nationality || '—'}</td>
                        <td style={{ padding: '10px 14px', fontSize: 13, color: C.dark }}>{g.document_number || '—'}</td>
                        <td style={{ padding: '10px 14px' }}>
                          <span style={{
                            fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
                            background: `${TAG_COLOR[g.tag] || C.teal}20`, color: TAG_COLOR[g.tag] || C.teal,
                          }}>{TAG_LABEL[g.tag] || g.tag}</span>
                        </td>
                        <td style={{ padding: '10px 14px', fontSize: 13, color: C.dark }}>{g.total_stays || 0}</td>
                        <td style={{ padding: '10px 14px' }}>
                          <button onClick={() => setExpanded(isExp ? null : g.id)} style={{
                            background: 'none', color: C.teal, fontWeight: 700, fontSize: 12, minHeight: 0, padding: 0,
                          }}>{isExp ? 'Masquer' : 'Détails'}</button>
                        </td>
                      </tr>
                      {isExp && (
                        <tr>
                          <td colSpan={6} style={{ padding: '4px 14px 16px', background: '#faf9f6', borderTop: `1px solid ${C.border}` }}>
                            <div style={{ maxWidth: 480 }}><GuestDetailFields g={g} /></div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
