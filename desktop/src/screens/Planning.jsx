import React, { useState, useEffect, useCallback } from 'react';
import { theme } from '../theme.js';
import { useApp, useAuth } from '../App.jsx';
import { staffColor, staffInitials } from '../constants/staffColors.js';

// ── Constants ──────────────────────────────────────────────────────────────

const SHIFT_TYPES = [
  { value: 'day',      label: 'Jour',     icon: '🌅', bg: '#0f766e18', color: '#0f766e' },
  { value: 'night',    label: 'Nuit',     icon: '🌙', bg: '#1f2a2e18', color: '#1f2a2e' },
  { value: 'off',      label: 'Repos',    icon: '☀️',  bg: '#88888818', color: '#888888' },
  { value: 'vacation', label: 'Congé',    icon: '🏖️', bg: '#e0a45818', color: '#e0a458' },
  { value: 'sick',     label: 'Maladie',  icon: '🤒', bg: '#ff7f5018', color: '#ff7f50' },
  { value: 'custom',   label: 'Autre',    icon: '⚙️',  bg: '#a855f718', color: '#a855f7' },
];

const SHIFT_MAP = Object.fromEntries(SHIFT_TYPES.map(s => [s.value, s]));
const DAY_LABELS_SHORT = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
const DAY_LABELS_FR    = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

function getMonday(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1 - day);
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function toISO(d) { return d.toISOString().split('T')[0]; }

function fmtDate(d) {
  return new Date(d + 'T00:00:00').toLocaleDateString('fr-MA', { day: 'numeric', month: 'long', year: 'numeric' });
}

// ── Small shared components ────────────────────────────────────────────────

function Tabs({ tabs, active, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 2, background: 'rgba(31,42,46,0.07)', borderRadius: 10, padding: 3, marginBottom: 20 }}>
      {tabs.map(t => (
        <button key={t.key} onClick={() => onChange(t.key)} style={{
          flex: 1, padding: '8px 4px', border: 'none', borderRadius: 8,
          background: active === t.key ? theme.white : 'transparent',
          color: active === t.key ? theme.teal : theme.dark,
          fontWeight: active === t.key ? 800 : 600,
          fontSize: 13, cursor: 'pointer', fontFamily: theme.font,
          boxShadow: active === t.key ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
          transition: 'all .15s',
        }}>{t.label}</button>
      ))}
    </div>
  );
}

function Modal({ title, onClose, children, width = 520 }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
         onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: theme.white, borderRadius: 16, padding: 28, width, maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: theme.dark }}>{title}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: theme.dark, opacity: 0.4 }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Btn({ children, onClick, variant = 'primary', style = {} }) {
  const styles = {
    primary:   { background: theme.teal, color: theme.white },
    secondary: { background: 'rgba(31,42,46,0.08)', color: theme.dark },
    danger:    { background: '#fee2e2', color: '#dc2626' },
    success:   { background: '#dcfce7', color: '#16a34a' },
  };
  return (
    <button onClick={onClick} style={{
      padding: '9px 18px', borderRadius: 8, border: 'none',
      fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: theme.font,
      ...styles[variant], ...style,
    }}>{children}</button>
  );
}

// ── Shift cell popover ─────────────────────────────────────────────────────

function CellPopover({ staffId, staffName, dateStr, existing, propertyId, onSaved, onClose }) {
  const [type, setType]    = useState(existing?.shift_type || 'day');
  const [start, setStart]  = useState(existing?.start_time || '08:00');
  const [end, setEnd]      = useState(existing?.end_time   || '20:00');
  const [saving, setSaving] = useState(false);

  const s = SHIFT_MAP[type];
  const showTime = type === 'day' || type === 'night' || type === 'custom';

  async function save() {
    setSaving(true);
    await window.db.invoke('schedules:setDay', {
      property_id: propertyId, staff_id: staffId, schedule_date: dateStr,
      shift_type: type,
      start_time: showTime ? start : null,
      end_time:   showTime ? end   : null,
    });
    setSaving(false);
    onSaved();
    onClose();
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 500 }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        background: theme.white, borderRadius: 14, padding: 20, width: 300,
        boxShadow: '0 8px 40px rgba(0,0,0,0.2)', border: '1px solid rgba(31,42,46,0.1)',
      }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: theme.dark, marginBottom: 2 }}>{staffName}</div>
        <div style={{ fontSize: 11, color: theme.dark, opacity: 0.5, marginBottom: 14 }}>{fmtDate(dateStr)}</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 14 }}>
          {SHIFT_TYPES.map(st => (
            <button key={st.value} onClick={() => setType(st.value)} style={{
              padding: '8px 6px', border: `2px solid ${type === st.value ? st.color : 'transparent'}`,
              borderRadius: 8, background: st.bg, cursor: 'pointer', fontFamily: theme.font,
              fontWeight: 700, fontSize: 12, color: st.color, textAlign: 'center',
            }}>
              {st.icon} {st.label}
            </button>
          ))}
        </div>
        {showTime && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 14 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, fontWeight: 700, opacity: 0.5, marginBottom: 3 }}>DÉBUT</div>
              <input type="time" value={start} onChange={e => setStart(e.target.value)}
                style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: '1.5px solid #ddd', fontSize: 13, fontFamily: theme.font }} />
            </div>
            <div style={{ marginTop: 14, opacity: 0.4 }}>→</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, fontWeight: 700, opacity: 0.5, marginBottom: 3 }}>FIN</div>
              <input type="time" value={end} onChange={e => setEnd(e.target.value)}
                style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: '1.5px solid #ddd', fontSize: 13, fontFamily: theme.font }} />
            </div>
          </div>
        )}
        <div style={{ display: 'flex', gap: 8 }}>
          <Btn variant="secondary" onClick={onClose} style={{ flex: 1 }}>Annuler</Btn>
          <Btn onClick={save} style={{ flex: 1 }} variant="primary">{saving ? '...' : 'Enregistrer'}</Btn>
        </div>
      </div>
    </div>
  );
}

// ── TAB 1: Calendar ───────────────────────────────────────────────────────

function CalendarTab({ propertyId }) {
  const { staff } = useAuth();
  const [weekStart, setWeekStart]   = useState(() => getMonday(new Date()));
  const [schedules, setSchedules]   = useState([]);
  const [allStaff, setAllStaff]     = useState([]);
  const [templates, setTemplates]   = useState([]);
  const [popover, setPopover]       = useState(null); // { staffId, staffName, dateStr, existing }
  const [genModal, setGenModal]     = useState(false);

  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const startStr  = toISO(weekStart);
  const endStr    = toISO(addDays(weekStart, 6));

  const load = useCallback(async () => {
    if (!propertyId) return;
    const [s, st, tmpl] = await Promise.all([
      window.db.invoke('schedules:getRange', { property_id: propertyId, start_date: startStr, end_date: endStr }),
      window.db.invoke('staff:getAll'),
      window.db.invoke('templates:getAll', { property_id: propertyId }),
    ]);
    setSchedules(s || []);
    setAllStaff(st || []);
    setTemplates(tmpl || []);
  }, [propertyId, startStr, endStr]);

  useEffect(() => { load(); }, [load]);

  function getSchedule(staffId, dateStr) {
    return schedules.find(s => s.staff_id === staffId && s.schedule_date === dateStr);
  }

  // Coverage: count how many on shift each day
  function getCoverage(dateStr) {
    const onShift = schedules.filter(s => s.schedule_date === dateStr && (s.shift_type === 'day' || s.shift_type === 'night' || s.shift_type === 'custom')).length;
    if (onShift === 0) return { icon: '⚠️', color: '#dc2626', label: 'Personne' };
    if (onShift === 1) return { icon: '🔴', color: '#f59e0b', label: '1 pers.' };
    return { icon: '✅', color: '#16a34a', label: `${onShift} pers.` };
  }

  const today = toISO(new Date());

  const fmtWeekRange = () => {
    const s = weekDates[0];
    const e = weekDates[6];
    const sD = s.toLocaleDateString('fr-MA', { day: 'numeric', month: 'long' });
    const eD = e.toLocaleDateString('fr-MA', { day: 'numeric', month: 'long', year: 'numeric' });
    return `Semaine du ${sD} au ${eD}`;
  };

  return (
    <div>
      {/* Week nav */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <Btn variant="secondary" onClick={() => setWeekStart(d => addDays(d, -7))}>← Préc.</Btn>
        <div style={{ flex: 1, textAlign: 'center', fontWeight: 700, fontSize: 14, color: theme.dark }}>{fmtWeekRange()}</div>
        <Btn variant="secondary" onClick={() => setWeekStart(getMonday(new Date()))}>Auj.</Btn>
        <Btn variant="secondary" onClick={() => setWeekStart(d => addDays(d, 7))}>Suiv. →</Btn>
        <Btn onClick={() => setGenModal(true)}>⚡ Générer</Btn>
      </div>

      {!propertyId && (
        <div style={{ textAlign: 'center', padding: 40, opacity: 0.4 }}>Sélectionnez une propriété</div>
      )}

      {propertyId && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
            <thead>
              <tr>
                <th style={{ width: 130, padding: '8px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, opacity: 0.5, textTransform: 'uppercase' }}>Employé</th>
                {weekDates.map((d, i) => {
                  const ds = toISO(d);
                  const isToday = ds === today;
                  return (
                    <th key={i} style={{
                      padding: '8px 4px', textAlign: 'center', fontSize: 11, fontWeight: 700,
                      color: isToday ? theme.teal : theme.dark,
                      background: isToday ? '#0f766e0a' : 'transparent',
                      borderRadius: 8,
                    }}>
                      <div>{DAY_LABELS_SHORT[d.getDay()]}</div>
                      <div style={{ fontSize: 15, fontWeight: 900 }}>{d.getDate()}</div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {allStaff.map(member => {
                const sc = staffColor(member.role);
                return (
                  <tr key={member.id}>
                    <td style={{ padding: '6px 12px 6px 0' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: sc.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, flexShrink: 0 }}>
                          {staffInitials(member.full_name)}
                        </div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: theme.dark, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 90 }}>
                          {member.full_name.split(' ')[0]}
                        </div>
                      </div>
                    </td>
                    {weekDates.map((d, i) => {
                      const ds = toISO(d);
                      const sched = getSchedule(member.id, ds);
                      const st = sched ? SHIFT_MAP[sched.shift_type] : null;
                      const isToday = ds === today;
                      return (
                        <td key={i} style={{ padding: '4px 3px' }}>
                          <button
                            onClick={() => setPopover({ staffId: member.id, staffName: member.full_name, dateStr: ds, existing: sched })}
                            title={sched ? `${st?.label} ${sched.start_time || ''} → ${sched.end_time || ''}` : 'Cliquer pour planifier'}
                            style={{
                              width: '100%', padding: '6px 4px', borderRadius: 8, border: 'none',
                              background: st ? st.bg : 'rgba(31,42,46,0.04)',
                              cursor: 'pointer', textAlign: 'center',
                              outline: isToday ? `2px solid ${theme.teal}40` : 'none',
                              transition: 'background .1s',
                            }}
                          >
                            {st ? (
                              <>
                                <div style={{ fontSize: 14 }}>{st.icon}</div>
                                <div style={{ fontSize: 9, fontWeight: 700, color: st.color, marginTop: 2 }}>
                                  {sched.start_time ? `${sched.start_time}` : st.label}
                                </div>
                              </>
                            ) : (
                              <div style={{ fontSize: 16, opacity: 0.15 }}>+</div>
                            )}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}

              {/* Coverage row */}
              {allStaff.length > 0 && (
                <tr>
                  <td style={{ padding: '6px 0', fontSize: 10, fontWeight: 700, opacity: 0.4, textTransform: 'uppercase' }}>Couverture</td>
                  {weekDates.map((d, i) => {
                    const cov = getCoverage(toISO(d));
                    return (
                      <td key={i} style={{ textAlign: 'center', padding: '4px 3px' }}>
                        <div style={{ fontSize: 11, color: cov.color, fontWeight: 700 }}>
                          {cov.icon}<br/><span style={{ fontSize: 9 }}>{cov.label}</span>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              )}
            </tbody>
          </table>

          {allStaff.length === 0 && (
            <div style={{ textAlign: 'center', padding: 40, opacity: 0.4 }}>
              Aucun employé actif trouvé.
            </div>
          )}
        </div>
      )}

      {/* Legend */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 16 }}>
        {SHIFT_TYPES.map(st => (
          <div key={st.value} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
            <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: st.color }} />
            <span style={{ opacity: 0.6 }}>{st.icon} {st.label}</span>
          </div>
        ))}
      </div>

      {/* Cell popover */}
      {popover && (
        <CellPopover
          staffId={popover.staffId}
          staffName={popover.staffName}
          dateStr={popover.dateStr}
          existing={popover.existing}
          propertyId={propertyId}
          onSaved={load}
          onClose={() => setPopover(null)}
        />
      )}

      {/* Generate modal */}
      {genModal && (
        <GenerateModal
          propertyId={propertyId}
          templates={templates}
          defaultStart={startStr}
          staffId={staff?.id}
          onGenerated={() => { load(); setGenModal(false); }}
          onClose={() => setGenModal(false)}
        />
      )}
    </div>
  );
}

function GenerateModal({ propertyId, templates, defaultStart, staffId, onGenerated, onClose }) {
  const [templateId, setTemplateId] = useState(templates[0]?.id || '');
  const [startDate, setStartDate]   = useState(defaultStart);
  const [weeks, setWeeks]           = useState(2);
  const [loading, setLoading]       = useState(false);
  const [result, setResult]         = useState(null);

  async function generate() {
    if (!templateId) return;
    setLoading(true);
    const res = await window.db.invoke('schedules:autoGenerate', {
      property_id: propertyId, start_date: startDate,
      weeks, template_id: templateId, created_by: staffId,
    });
    setLoading(false);
    setResult(res);
    if (res.ok) setTimeout(onGenerated, 1500);
  }

  return (
    <Modal title="⚡ Générer le planning" onClose={onClose}>
      {templates.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 20, opacity: 0.5 }}>
          Aucun modèle de rotation. Créez-en un dans l'onglet Modèles.
        </div>
      ) : (
        <>
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 6 }}>Modèle de rotation</label>
            <select value={templateId} onChange={e => setTemplateId(e.target.value)}
              style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid #ddd', fontSize: 13, fontFamily: theme.font }}>
              {templates.map(t => <option key={t.id} value={t.id}>{t.name} ({t.cycle_days}j)</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 6 }}>Date de début</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid #ddd', fontSize: 13, fontFamily: theme.font }} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 6 }}>Durée</label>
              <select value={weeks} onChange={e => setWeeks(Number(e.target.value))}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid #ddd', fontSize: 13, fontFamily: theme.font }}>
                <option value={1}>1 semaine</option>
                <option value={2}>2 semaines</option>
                <option value={4}>4 semaines</option>
                <option value={8}>8 semaines</option>
              </select>
            </div>
          </div>
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: '#15803d' }}>
            ℹ️ Les congés approuvés seront automatiquement respectés. Les shifts existants sur la période seront remplacés.
          </div>
          {result && (
            <div style={{ background: result.ok ? '#f0fdf4' : '#fef2f2', border: `1px solid ${result.ok ? '#bbf7d0' : '#fecaca'}`, borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 13, fontWeight: 700, color: result.ok ? '#15803d' : '#dc2626' }}>
              {result.ok ? `✅ ${result.generated} shifts générés !` : `❌ ${result.error}`}
            </div>
          )}
          <div style={{ display: 'flex', gap: 10 }}>
            <Btn variant="secondary" onClick={onClose} style={{ flex: 1 }}>Annuler</Btn>
            <Btn onClick={generate} style={{ flex: 1 }}>{loading ? 'Génération...' : '✅ Générer et appliquer'}</Btn>
          </div>
        </>
      )}
    </Modal>
  );
}

// ── TAB 2: Templates ───────────────────────────────────────────────────────

const PATTERN_OPTIONS = [
  { value: 'day',      label: 'Jour 🌅' },
  { value: 'night',    label: 'Nuit 🌙' },
  { value: 'off',      label: 'Repos ☀️' },
  { value: 'vacation', label: 'Congé 🏖️' },
];

function TemplateModal({ initial, propertyId, onClose, onSaved }) {
  const isEdit = !!initial;
  const [name, setName]       = useState(initial?.name || '');
  const [pattern, setPattern] = useState(initial ? JSON.parse(initial.pattern || '[]') : ['day','day','day','day','day','night','off']);
  const [dayStart, setDayStart]     = useState(initial?.day_shift_start     || '08:00');
  const [dayEnd,   setDayEnd]       = useState(initial?.day_shift_end       || '20:00');
  const [nightStart, setNightStart] = useState(initial?.night_shift_start   || '20:00');
  const [nightEnd,   setNightEnd]   = useState(initial?.night_shift_end     || '08:00');
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!name.trim()) return;
    setSaving(true);
    if (isEdit) {
      await window.db.invoke('templates:update', { id: initial.id, name, pattern, cycle_days: pattern.length, day_shift_start: dayStart, day_shift_end: dayEnd, night_shift_start: nightStart, night_shift_end: nightEnd });
    } else {
      await window.db.invoke('templates:create', { property_id: propertyId, name, pattern, cycle_days: pattern.length, day_shift_start: dayStart, day_shift_end: dayEnd, night_shift_start: nightStart, night_shift_end: nightEnd });
    }
    setSaving(false);
    onSaved();
    onClose();
  }

  return (
    <Modal title={isEdit ? 'Modifier le modèle' : 'Nouveau modèle'} onClose={onClose} width={560}>
      <div style={{ marginBottom: 14 }}>
        <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 6 }}>Nom du modèle</label>
        <input value={name} onChange={e => setName(e.target.value)}
          style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid #ddd', fontSize: 14, fontFamily: theme.font }} />
      </div>

      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>Cycle jour par jour ({pattern.length} jours)</div>
        {pattern.map((val, i) => {
          const st = SHIFT_MAP[val] || SHIFT_MAP.off;
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: theme.dark, opacity: 0.5, width: 50 }}>Jour {i + 1}</div>
              <select value={val} onChange={e => setPattern(p => { const n = [...p]; n[i] = e.target.value; return n; })}
                style={{ flex: 1, padding: '7px 10px', borderRadius: 8, border: `1.5px solid ${st.color}40`, background: st.bg, color: st.color, fontWeight: 700, fontSize: 12, fontFamily: theme.font }}>
                {PATTERN_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <button onClick={() => setPattern(p => p.filter((_, j) => j !== i))}
                style={{ padding: '6px 10px', borderRadius: 7, border: 'none', background: '#fee2e2', color: '#dc2626', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>✕</button>
            </div>
          );
        })}
        <button onClick={() => setPattern(p => [...p, 'day'])}
          style={{ padding: '7px 14px', borderRadius: 8, border: '1.5px dashed #ccc', background: 'transparent', color: theme.teal, cursor: 'pointer', fontWeight: 700, fontSize: 12, marginTop: 4 }}>
          + Ajouter un jour
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Shift Jour — Début',  val: dayStart,   set: setDayStart },
          { label: 'Shift Jour — Fin',    val: dayEnd,     set: setDayEnd },
          { label: 'Shift Nuit — Début',  val: nightStart, set: setNightStart },
          { label: 'Shift Nuit — Fin',    val: nightEnd,   set: setNightEnd },
        ].map(({ label, val, set }) => (
          <div key={label}>
            <label style={{ fontSize: 11, fontWeight: 700, display: 'block', marginBottom: 4, opacity: 0.6 }}>{label}</label>
            <input type="time" value={val} onChange={e => set(e.target.value)}
              style={{ width: '100%', padding: '7px 10px', borderRadius: 8, border: '1.5px solid #ddd', fontSize: 13, fontFamily: theme.font }} />
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <Btn variant="secondary" onClick={onClose} style={{ flex: 1 }}>Annuler</Btn>
        <Btn onClick={save} style={{ flex: 1 }}>{saving ? '...' : 'Enregistrer'}</Btn>
      </div>
    </Modal>
  );
}

function TemplatesTab({ propertyId }) {
  const [templates, setTemplates] = useState([]);
  const [modal, setModal]         = useState(null); // null | 'new' | template object

  const load = useCallback(async () => {
    if (!propertyId) return;
    const data = await window.db.invoke('templates:getAll', { property_id: propertyId });
    setTemplates(data || []);
  }, [propertyId]);

  useEffect(() => { load(); }, [load]);

  async function del(id) {
    if (!confirm('Supprimer ce modèle ?')) return;
    await window.db.invoke('templates:delete', { id });
    load();
  }

  const iconForType = v => SHIFT_MAP[v]?.icon || '?';

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <Btn onClick={() => setModal('new')}>+ Nouveau modèle</Btn>
      </div>

      {templates.length === 0 && (
        <div style={{ textAlign: 'center', padding: 40, opacity: 0.4 }}>
          Aucun modèle. Créez-en un pour générer automatiquement le planning.
        </div>
      )}

      {templates.map(t => {
        const pat = JSON.parse(t.pattern || '[]');
        return (
          <div key={t.id} style={{ background: theme.white, borderRadius: 12, padding: '16px 20px', marginBottom: 10, border: '1px solid rgba(31,42,46,0.08)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 4 }}>{t.name}</div>
                <div style={{ fontSize: 11, opacity: 0.5, marginBottom: 6 }}>
                  Jour: {t.day_shift_start}→{t.day_shift_end} · Nuit: {t.night_shift_start}→{t.night_shift_end}
                </div>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {pat.map((v, i) => {
                    const st = SHIFT_MAP[v] || SHIFT_MAP.off;
                    return (
                      <div key={i} title={`Jour ${i+1}: ${st.label}`}
                        style={{ width: 28, height: 28, borderRadius: 6, background: st.bg, color: st.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>
                        {st.icon}
                      </div>
                    );
                  })}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <Btn variant="secondary" onClick={() => setModal(t)} style={{ padding: '6px 12px', fontSize: 12 }}>✏️</Btn>
                <Btn variant="danger" onClick={() => del(t.id)} style={{ padding: '6px 12px', fontSize: 12 }}>🗑️</Btn>
              </div>
            </div>
          </div>
        );
      })}

      {modal && (
        <TemplateModal
          initial={modal === 'new' ? null : modal}
          propertyId={propertyId}
          onClose={() => setModal(null)}
          onSaved={load}
        />
      )}
    </div>
  );
}

// ── TAB 3: Congés ──────────────────────────────────────────────────────────

function TimeoffTab({ propertyId }) {
  const { staff: currentStaff } = useAuth();
  const [requests, setRequests] = useState([]);
  const [allStaff, setAllStaff] = useState([]);
  const [addModal, setAddModal] = useState(false);

  const load = useCallback(async () => {
    if (!propertyId) return;
    const [r, s] = await Promise.all([
      window.db.invoke('timeoff:getAll', { property_id: propertyId }),
      window.db.invoke('staff:getAll'),
    ]);
    setRequests(r || []);
    setAllStaff(s || []);
  }, [propertyId]);

  useEffect(() => { load(); }, [load]);

  async function review(id, status) {
    await window.db.invoke('timeoff:review', { id, status, reviewed_by: currentStaff?.id });
    load();
  }

  async function del(id) {
    if (!confirm('Supprimer cette demande ?')) return;
    await window.db.invoke('timeoff:delete', { id });
    load();
  }

  const pending  = requests.filter(r => r.status === 'pending');
  const history  = requests.filter(r => r.status !== 'pending');

  const typeLabel = { day_off: 'Jour de congé', vacation: 'Vacances', sick: 'Maladie', other: 'Autre' };
  const typeIcon  = { day_off: '📅', vacation: '🏖️', sick: '🤒', other: '📝' };

  function dayCount(start, end) {
    const ms = new Date(end + 'T00:00:00') - new Date(start + 'T00:00:00');
    return Math.round(ms / 86400000) + 1;
  }

  function RequestCard({ req }) {
    const sc = staffColor(req.role);
    const days = dayCount(req.start_date, req.end_date);
    return (
      <div style={{ background: theme.white, borderRadius: 12, padding: '14px 16px', marginBottom: 8, border: '1px solid rgba(31,42,46,0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: sc.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, flexShrink: 0 }}>
            {staffInitials(req.full_name)}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
              <span style={{ fontWeight: 800, fontSize: 13 }}>{req.full_name}</span>
              <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 700,
                background: req.status === 'pending' ? '#fef3c7' : req.status === 'approved' ? '#dcfce7' : '#fee2e2',
                color:      req.status === 'pending' ? '#92400e' : req.status === 'approved' ? '#15803d' : '#dc2626' }}>
                {req.status === 'pending' ? '🟡 En attente' : req.status === 'approved' ? '✅ Approuvé' : '❌ Refusé'}
              </span>
            </div>
            <div style={{ fontSize: 12, color: theme.dark, opacity: 0.7 }}>
              {typeIcon[req.type]} {typeLabel[req.type] || req.type} · {fmtDate(req.start_date)} → {fmtDate(req.end_date)} ({days} j)
            </div>
            {req.reason && <div style={{ fontSize: 11, opacity: 0.5, marginTop: 3 }}>"{req.reason}"</div>}
          </div>
        </div>
        {req.status === 'pending' && (
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <Btn variant="success" onClick={() => review(req.id, 'approved')} style={{ flex: 1 }}>✅ Approuver</Btn>
            <Btn variant="danger"  onClick={() => review(req.id, 'rejected')} style={{ flex: 1 }}>❌ Refuser</Btn>
          </div>
        )}
        {req.status !== 'pending' && (
          <div style={{ marginTop: 8, textAlign: 'right' }}>
            <button onClick={() => del(req.id)} style={{ border: 'none', background: 'none', color: theme.dark, opacity: 0.4, cursor: 'pointer', fontSize: 12 }}>Supprimer</button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <Btn onClick={() => setAddModal(true)}>+ Ajouter un congé</Btn>
      </div>

      {pending.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.8, color: theme.dark, opacity: 0.4, marginBottom: 10 }}>
            Demandes en attente ({pending.length})
          </div>
          {pending.map(r => <RequestCard key={r.id} req={r} />)}
        </div>
      )}

      {history.length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.8, color: theme.dark, opacity: 0.4, marginBottom: 10 }}>
            Historique
          </div>
          {history.map(r => <RequestCard key={r.id} req={r} />)}
        </div>
      )}

      {requests.length === 0 && (
        <div style={{ textAlign: 'center', padding: 40, opacity: 0.4 }}>
          Aucune demande de congé.
        </div>
      )}

      {addModal && (
        <AddTimeoffModal
          propertyId={propertyId}
          allStaff={allStaff}
          onClose={() => setAddModal(false)}
          onSaved={load}
        />
      )}
    </div>
  );
}

function AddTimeoffModal({ propertyId, allStaff, onClose, onSaved }) {
  const [staffId, setStaffId] = useState(allStaff[0]?.id || '');
  const [type, setType]       = useState('vacation');
  const [start, setStart]     = useState('');
  const [end, setEnd]         = useState('');
  const [reason, setReason]   = useState('');
  const [saving, setSaving]   = useState(false);

  async function save() {
    if (!staffId || !start || !end) return;
    setSaving(true);
    await window.db.invoke('timeoff:create', {
      staff_id: staffId, property_id: propertyId,
      start_date: start, end_date: end,
      type, reason, status: 'approved',
    });
    setSaving(false);
    onSaved();
    onClose();
  }

  return (
    <Modal title="Ajouter un congé / absence" onClose={onClose}>
      <div style={{ marginBottom: 14 }}>
        <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 6 }}>Employé</label>
        <select value={staffId} onChange={e => setStaffId(e.target.value)}
          style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid #ddd', fontSize: 13, fontFamily: theme.font }}>
          {allStaff.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
        </select>
      </div>
      <div style={{ marginBottom: 14 }}>
        <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 6 }}>Type</label>
        <div style={{ display: 'flex', gap: 8 }}>
          {[['vacation','🏖️ Vacances'],['day_off','📅 Congé'],['sick','🤒 Maladie'],['other','📝 Autre']].map(([v,l]) => (
            <button key={v} onClick={() => setType(v)} style={{
              flex: 1, padding: '8px 4px', borderRadius: 8, border: `2px solid ${type === v ? theme.teal : 'transparent'}`,
              background: type === v ? '#0f766e18' : 'rgba(31,42,46,0.05)',
              color: type === v ? theme.teal : theme.dark, fontWeight: 700, fontSize: 11, cursor: 'pointer', fontFamily: theme.font,
            }}>{l}</button>
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 6 }}>Du</label>
          <input type="date" value={start} onChange={e => setStart(e.target.value)}
            style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid #ddd', fontSize: 13, fontFamily: theme.font }} />
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 6 }}>Au</label>
          <input type="date" value={end || start} onChange={e => setEnd(e.target.value)}
            style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid #ddd', fontSize: 13, fontFamily: theme.font }} />
        </div>
      </div>
      <div style={{ marginBottom: 20 }}>
        <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 6 }}>Motif (optionnel)</label>
        <input value={reason} onChange={e => setReason(e.target.value)}
          style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1.5px solid #ddd', fontSize: 13, fontFamily: theme.font }} />
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <Btn variant="secondary" onClick={onClose} style={{ flex: 1 }}>Annuler</Btn>
        <Btn onClick={save} style={{ flex: 1 }}>{saving ? '...' : 'Enregistrer (approuvé)'}</Btn>
      </div>
    </Modal>
  );
}

// ── Main Planning screen ───────────────────────────────────────────────────

export default function Planning() {
  const { selectedPropertyId } = useApp();
  const [tab, setTab] = useState('calendar');

  const TABS = [
    { key: 'calendar',  label: '📅 Calendrier' },
    { key: 'templates', label: '⚙️ Modèles' },
    { key: 'timeoff',   label: '🏖️ Congés' },
  ];

  return (
    <div style={{ fontFamily: theme.font }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 900, color: theme.dark, margin: 0 }}>Planning</h1>
        <p style={{ fontSize: 13, color: theme.dark, opacity: 0.5, marginTop: 4, margin: 0 }}>
          Gestion des horaires et rotations de l'équipe
        </p>
      </div>

      <Tabs tabs={TABS} active={tab} onChange={setTab} />

      {tab === 'calendar'  && <CalendarTab  propertyId={selectedPropertyId} />}
      {tab === 'templates' && <TemplatesTab propertyId={selectedPropertyId} />}
      {tab === 'timeoff'   && <TimeoffTab   propertyId={selectedPropertyId} />}
    </div>
  );
}
