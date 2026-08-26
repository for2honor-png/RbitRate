import React, { useState, useEffect } from 'react';
import { theme } from '../theme.js';
import { useApp, useAuth } from '../App.jsx';
import { invoke, on } from '../db.js';
import { staffColor, staffInitials } from '../constants/staffColors.js';

const SHIFT_INFO = {
  day:      { icon: '🌅', label: 'Jour',    color: '#0f766e', bg: '#0f766e18' },
  night:    { icon: '🌙', label: 'Nuit',    color: '#1f2a2e', bg: '#1f2a2e18' },
  off:      { icon: '☀️',  label: 'Repos',   color: '#888',    bg: '#88888818' },
  vacation: { icon: '🏖️', label: 'Congé',   color: '#e0a458', bg: '#e0a45818' },
  sick:     { icon: '🤒', label: 'Maladie', color: '#ff7f50', bg: '#ff7f5018' },
  custom:   { icon: '⚙️',  label: 'Shift',   color: '#a855f7', bg: '#a855f718' },
};
const DAYS_SHORT = ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'];
function getMonday(d) { const x = new Date(d); const day = x.getDay(); x.setDate(x.getDate()+(day===0?-6:1-day)); x.setHours(0,0,0,0); return x; }
function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate()+n); return x; }
function toISO(d) { return d.toISOString().split('T')[0]; }

function StatCard({ label, value, color, sub }) {
  return (
    <div style={{
      background: theme.white, borderRadius: 12, padding: 20,
      border: '1px solid rgba(31,42,46,0.08)', flex: 1, minWidth: 130,
    }}>
      <div style={{ fontSize: 28, fontWeight: 900, color: color || theme.dark }}>{value}</div>
      <div style={{ fontSize: 12, color: theme.dark, opacity: 0.55, marginTop: 4, fontWeight: 600 }}>{label}</div>
      {sub != null && (
        <div style={{ fontSize: 11, color: theme.dark, opacity: 0.35, marginTop: 2 }}>{sub}</div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const { selectedPropertyId, setPage, navigateToCheckIn } = useApp();
  const { staff } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [todayStats, setTodayStats] = useState({ arrivals: 0, departures: 0 });
  const [todayFinance, setTodayFinance] = useState({ income: 0, expense: 0 });
  const [activeShifts, setActiveShifts] = useState([]);
  const [recentTxns, setRecentTxns] = useState([]);
  const [todaySchedule, setTodaySchedule] = useState(null);
  const [weekSchedule, setWeekSchedule]   = useState([]);
  const [shiftBanner, setShiftBanner]     = useState(null);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  useEffect(() => {
    if (!selectedPropertyId) return;
    invoke('rooms:getAll', { property_id: selectedPropertyId }).then(setRooms);
    invoke('reservations:getTodayStats', { property_id: selectedPropertyId }).then(r => { if (r) setTodayStats(r); });
    invoke('finance:getTodayTotals', { property_id: selectedPropertyId }).then(r => { if (r) setTodayFinance(r); });
    invoke('shifts:getActive', { property_id: selectedPropertyId }).then(r => { if (r) setActiveShifts(r); });
    invoke('finance:getRecentTransactions', { property_id: selectedPropertyId, limit: 4 }).then(r => { if (r) setRecentTxns(r); });
  }, [selectedPropertyId]);

  useEffect(() => {
    if (!staff?.id) return;
    const mon = toISO(getMonday(new Date()));
    invoke('schedules:getTodayForStaff', { staff_id: staff.id }).then(r => setTodaySchedule(r || null));
    invoke('schedules:getWeekForStaff',  { staff_id: staff.id, start_date: mon }).then(r => { if (r) setWeekSchedule(r); });
  }, [staff?.id]);

  useEffect(() => {
    const unsub = on('schedule:shiftReminder', (data) => {
      if (!bannerDismissed) setShiftBanner(data);
    });
    return unsub;
  }, [bannerDismissed]);

  const total       = rooms.length;
  const available   = rooms.filter(r => r.status === 'available').length;
  const occupied    = rooms.filter(r => r.status === 'occupied').length;
  const cleaning    = rooms.filter(r => r.status === 'cleaning').length;
  const maintenance = rooms.filter(r => r.status === 'maintenance').length;
  const occupancyPct = total > 0 ? Math.round((occupied / total) * 100) : 0;

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(getMonday(new Date()), i);
    const ds = toISO(d);
    const sched = weekSchedule.find(s => s.schedule_date === ds);
    const isToday = ds === toISO(new Date());
    return { d, ds, sched, isToday };
  });

  return (
    <div style={{ fontFamily: theme.font }}>
      {/* Shift reminder banner */}
      {shiftBanner && !bannerDismissed && (
        <div style={{
          background: theme.teal, color: theme.white,
          borderRadius: 12, padding: '14px 20px', marginBottom: 20,
          display: 'flex', alignItems: 'center', gap: 16,
          boxShadow: '0 4px 20px rgba(15,118,110,0.3)',
        }}>
          <div style={{ fontSize: 24 }}>⏰</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 14 }}>
              Votre shift {shiftBanner.shift_type === 'day' ? 'Jour' : 'Nuit'} commence dans 30 minutes ({shiftBanner.start_time})
            </div>
            <div style={{ fontSize: 12, opacity: 0.85, marginTop: 2 }}>
              Pensez à ouvrir votre shift et à enregistrer la caisse.
            </div>
          </div>
          <button
            onClick={() => setPage('shifts')}
            style={{ background: theme.white, color: theme.teal, borderRadius: 8, padding: '8px 16px', border: 'none', fontWeight: 800, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap' }}
          >Ouvrir le Shift →</button>
          <button
            onClick={() => { setShiftBanner(null); setBannerDismissed(true); }}
            style={{ background: 'none', border: 'none', color: theme.white, opacity: 0.7, fontSize: 20, cursor: 'pointer', lineHeight: 1 }}
          >✕</button>
        </div>
      )}

      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 900, color: theme.dark, margin: 0 }}>Tableau de bord</h1>
        <p style={{ fontSize: 13, color: theme.dark, opacity: 0.5, marginTop: 4, margin: 0 }}>
          Vue d'ensemble de votre établissement
        </p>
      </div>

      {/* My schedule section */}
      {(todaySchedule || weekSchedule.length > 0) && (
        <div style={{ background: theme.white, borderRadius: 12, padding: '14px 18px', marginBottom: 16, border: '1px solid rgba(31,42,46,0.08)' }}>
          <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.5, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 10 }}>Mon planning cette semaine</div>

          {todaySchedule && (() => {
            const si = SHIFT_INFO[todaySchedule.shift_type] || SHIFT_INFO.custom;
            const isWorking = todaySchedule.shift_type === 'day' || todaySchedule.shift_type === 'night' || todaySchedule.shift_type === 'custom';
            return (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12, padding: '10px 14px', background: si.bg, borderRadius: 10 }}>
                <div style={{ fontSize: 22 }}>{si.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 800, fontSize: 14, color: si.color }}>
                    {si.label} aujourd'hui
                    {todaySchedule.start_time ? ` — ${todaySchedule.start_time} → ${todaySchedule.end_time}` : ''}
                  </div>
                </div>
                {isWorking && (
                  <button onClick={() => setPage('shifts')} style={{ background: si.color, color: theme.white, borderRadius: 8, padding: '7px 14px', border: 'none', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>
                    Ouvrir le Shift
                  </button>
                )}
              </div>
            );
          })()}

          <div style={{ display: 'flex', gap: 6 }}>
            {weekDays.map(({ d, ds, sched, isToday }) => {
              const si = sched ? (SHIFT_INFO[sched.shift_type] || SHIFT_INFO.custom) : null;
              return (
                <div key={ds} style={{ flex: 1, textAlign: 'center' }}>
                  <div style={{ fontSize: 9, fontWeight: 700, opacity: 0.4, textTransform: 'uppercase', marginBottom: 3 }}>{DAYS_SHORT[d.getDay()]}</div>
                  <div style={{
                    padding: '6px 0', borderRadius: 8,
                    background: si ? si.bg : 'rgba(31,42,46,0.04)',
                    border: isToday ? `2px solid ${si?.color || theme.teal}` : '2px solid transparent',
                    fontSize: 16,
                  }}>
                    {si ? si.icon : <span style={{ opacity: 0.15 }}>–</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Occupancy bar */}
      {total > 0 && (
        <div style={{
          background: theme.white, borderRadius: 12, padding: '16px 20px',
          border: '1px solid rgba(31,42,46,0.08)', marginBottom: 20,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, opacity: 0.55, textTransform: 'uppercase', letterSpacing: 0.4 }}>
              Taux d'occupation
            </span>
            <span style={{ fontSize: 20, fontWeight: 900, color: occupied > 0 ? theme.coral : theme.teal }}>
              {occupancyPct}%
            </span>
          </div>
          <div style={{ height: 8, borderRadius: 4, background: 'rgba(31,42,46,0.08)', overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 4,
              background: occupancyPct > 80 ? theme.coral : occupancyPct > 50 ? theme.saffron : theme.teal,
              width: `${occupancyPct}%`, transition: 'width 0.6s ease',
            }} />
          </div>
          <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
            {[
              { label: 'Occupées', count: occupied, color: theme.coral },
              { label: 'Libres',   count: available, color: theme.teal },
              { label: 'Nettoyage', count: cleaning, color: theme.saffron },
              { label: 'Maintenance', count: maintenance, color: '#6b7280' },
            ].map(({ label, count, color }) => count > 0 && (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, display: 'inline-block' }} />
                <span style={{ color: theme.dark, opacity: 0.6 }}>{count} {label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stat cards row 1: rooms */}
      <div style={{ display: 'flex', gap: 14, marginBottom: 14, flexWrap: 'wrap' }}>
        <StatCard label="Total chambres"    value={total}       color={theme.dark} />
        <StatCard label="🟢 Libres"         value={available}   color={theme.teal} />
        <StatCard label="🔴 Occupées"       value={occupied}    color={theme.coral} sub={total > 0 ? `${occupancyPct}%` : null} />
        <StatCard label="🧹 Nettoyage"      value={cleaning}    color={theme.saffron} />
        <StatCard label="🔧 Maintenance"    value={maintenance} color="#6b7280" />
      </div>

      {/* Stat cards row 2: today */}
      <div style={{ display: 'flex', gap: 14, marginBottom: 14, flexWrap: 'wrap' }}>
        <StatCard
          label="🚶 Arrivées aujourd'hui"
          value={todayStats.arrivals}
          color={todayStats.arrivals > 0 ? theme.teal : theme.dark}
        />
        <StatCard
          label="🧳 Départs aujourd'hui"
          value={todayStats.departures}
          color={todayStats.departures > 0 ? theme.coral : theme.dark}
        />
        <StatCard label="💰 Recettes aujourd'hui (MAD)" value={todayFinance.income}  color={theme.teal} />
        <StatCard label="📉 Dépenses aujourd'hui (MAD)" value={todayFinance.expense} color={theme.coral} />
      </div>

      {/* Active shifts */}
      {activeShifts.length > 0 && (
        <div style={{ background: theme.white, borderRadius: 12, padding: '14px 18px', marginBottom: 14, border: '1px solid rgba(31,42,46,0.08)' }}>
          <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.5, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 10 }}>
            Shifts actifs
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {activeShifts.map(s => {
              const sc = staffColor(s.role);
              return (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8, background: sc.bg, borderRadius: 8, padding: '7px 12px' }}>
                  <div style={{
                    width: 26, height: 26, borderRadius: '50%', background: sc.color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: theme.white, fontSize: 10, fontWeight: 800,
                  }}>{staffInitials(s.full_name)}</div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: sc.color }}>{s.full_name}</div>
                    <div style={{ fontSize: 10, color: theme.dark, opacity: 0.5 }}>{sc.label}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent transactions */}
      {recentTxns.length > 0 && (
        <div style={{ background: theme.white, borderRadius: 12, padding: '14px 18px', marginBottom: 28, border: '1px solid rgba(31,42,46,0.08)' }}>
          <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.5, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 10 }}>
            Transactions récentes
          </div>
          {recentTxns.map(t => {
            const sc = staffColor(t.role);
            const isIncome = t.type === 'income';
            return (
              <div key={t.id} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 0', borderBottom: '1px solid rgba(31,42,46,0.05)',
              }}>
                <div style={{ width: 4, alignSelf: 'stretch', borderRadius: 2, background: sc.color, flexShrink: 0 }} />
                <div style={{
                  width: 26, height: 26, borderRadius: '50%', background: sc.bg, color: sc.color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 9, fontWeight: 800, flexShrink: 0,
                }}>{staffInitials(t.full_name)}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: theme.dark, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {t.description || t.category}
                  </div>
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: isIncome ? theme.teal : theme.coral, flexShrink: 0 }}>
                  {isIncome ? '+' : '-'}{(t.amount || 0).toLocaleString('fr-MA')} MAD
                </div>
              </div>
            );
          })}
        </div>
      )}
      {activeShifts.length === 0 && recentTxns.length === 0 && <div style={{ marginBottom: 28 }} />}

      {/* Quick actions */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: theme.dark, opacity: 0.5, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>
          Actions rapides
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button
            onClick={() => navigateToCheckIn(null)}
            style={{
              background: theme.teal, color: theme.white, borderRadius: 8,
              padding: '10px 20px', border: 'none', fontWeight: 700, fontSize: 13,
              fontFamily: theme.font, cursor: 'pointer',
            }}
          >+ Nouveau check-in</button>
          <button
            onClick={() => setPage('rooms')}
            style={{
              background: 'rgba(31,42,46,0.07)', color: theme.dark, borderRadius: 8,
              padding: '10px 20px', border: 'none', fontWeight: 700, fontSize: 13,
              fontFamily: theme.font, cursor: 'pointer',
            }}
          >Voir les chambres</button>
          <button
            onClick={() => setPage('guests')}
            style={{
              background: 'rgba(31,42,46,0.07)', color: theme.dark, borderRadius: 8,
              padding: '10px 20px', border: 'none', fontWeight: 700, fontSize: 13,
              fontFamily: theme.font, cursor: 'pointer',
            }}
          >Clients</button>
          <button
            onClick={() => setPage('properties')}
            style={{
              background: 'rgba(31,42,46,0.07)', color: theme.dark, borderRadius: 8,
              padding: '10px 20px', border: 'none', fontWeight: 700, fontSize: 13,
              fontFamily: theme.font, cursor: 'pointer',
            }}
          >Propriétés</button>
        </div>
      </div>

      {!selectedPropertyId && (
        <div style={{ textAlign: 'center', marginTop: 60, color: theme.dark, opacity: 0.4 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🏨</div>
          <div style={{ fontSize: 15, fontWeight: 600 }}>Aucune propriété configurée</div>
          <div style={{ fontSize: 13, marginTop: 4 }}>Commencez par ajouter votre première propriété.</div>
          <button
            onClick={() => setPage('properties')}
            style={{
              marginTop: 16, background: theme.teal, color: theme.white,
              borderRadius: 8, padding: '10px 20px', border: 'none',
              fontWeight: 700, fontSize: 13, fontFamily: theme.font, cursor: 'pointer',
            }}
          >Ajouter une propriété</button>
        </div>
      )}
    </div>
  );
}
