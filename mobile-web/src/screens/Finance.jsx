import React, { useState, useEffect, useCallback } from 'react';
import { theme } from '../theme.js';
import { useApp, useAuth } from '../App.jsx';
import { invoke } from '../db.js';
import { staffColor, staffInitials } from '../constants/staffColors.js';

const CAT_LABELS = {
  room_revenue: 'Chambres', fnb: 'F&B', laundry: 'Blanchisserie',
  transport: 'Transport', extras: 'Extras', commission: 'Commission',
  supplies: 'Fournitures', maintenance: 'Maintenance', salary: 'Salaire',
  utilities: 'Charges', ota_fee: 'Frais OTA', other: 'Autre',
};

const PAY_LABELS = {
  cash: 'Espèces', card: 'Carte', bank_transfer: 'Virement',
  ota_collected: 'OTA', agency: 'Agence', other: 'Autre',
};

const PERIODS = [
  { key: 'day',   label: 'Jour' },
  { key: 'week',  label: 'Semaine' },
  { key: 'month', label: 'Mois' },
  { key: 'year',  label: 'Année' },
];

// Convert raw transaction rows into {type,category,payment_method,total} aggregated records
function aggregateTotals(rawTotals) {
  const map = {};
  for (const t of rawTotals) {
    const key = `${t.type}|${t.category}|${t.payment_method}`;
    if (!map[key]) map[key] = { type: t.type, category: t.category, payment_method: t.payment_method, total: 0 };
    map[key].total += (t.amount || 0);
  }
  return Object.values(map);
}

// Convert raw byStaff rows into aggregated {recorded_by, full_name, role, type, total}
function aggregateByStaff(rawByStaff) {
  const map = {};
  for (const t of rawByStaff) {
    const staffId = t.recorded_by || '__';
    const key = `${staffId}|${t.type}`;
    if (!map[key]) {
      map[key] = {
        recorded_by: t.recorded_by,
        full_name: t.staff?.full_name || t.full_name || 'Inconnu',
        role: t.staff?.role || t.role,
        type: t.type,
        total: 0,
      };
    }
    map[key].total += (t.amount || 0);
  }
  return Object.values(map);
}

function KpiCard({ label, value, color, sub }) {
  return (
    <div style={{
      background: theme.white, borderRadius: 12, padding: '18px 20px',
      border: '1px solid rgba(31,42,46,0.08)', flex: 1, minWidth: 140,
    }}>
      <div style={{ fontSize: 26, fontWeight: 900, color: color || theme.dark }}>
        {(value || 0).toLocaleString('fr-MA')}
      </div>
      <div style={{ fontSize: 11, color: theme.dark, opacity: 0.5, marginTop: 3, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.3 }}>{label}</div>
      {sub != null && <div style={{ fontSize: 11, color: theme.dark, opacity: 0.35, marginTop: 1 }}>{sub}</div>}
    </div>
  );
}

function CategoryBreakdown({ totals, type }) {
  const filtered = totals.filter(t => t.type === type);
  const byCat = {};
  for (const t of filtered) {
    byCat[t.category] = (byCat[t.category] || 0) + (t.total || t.amount || 0);
  }
  const entries = Object.entries(byCat).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((s, [, v]) => s + v, 0);
  if (!entries.length) return <div style={{ opacity: 0.3, fontSize: 13 }}>Aucune donnée</div>;

  return (
    <div>
      {entries.map(([cat, val]) => (
        <div key={cat} style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 12, color: theme.dark }}>{CAT_LABELS[cat] || cat}</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: theme.dark }}>{val.toLocaleString('fr-MA')} MAD</span>
          </div>
          <div style={{ height: 6, background: 'rgba(31,42,46,0.08)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 3,
              background: type === 'income' ? theme.teal : theme.coral,
              width: `${total > 0 ? Math.round((val / total) * 100) : 0}%`,
            }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function PayMethodBreakdown({ totals }) {
  const byMethod = {};
  for (const t of totals.filter(t => t.type === 'income')) {
    byMethod[t.payment_method] = (byMethod[t.payment_method] || 0) + (t.total || t.amount || 0);
  }
  const entries = Object.entries(byMethod).filter(([k]) => k).sort((a, b) => b[1] - a[1]);
  if (!entries.length) return <div style={{ opacity: 0.3, fontSize: 13 }}>Aucune donnée</div>;

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
      {entries.map(([method, val]) => (
        <div key={method} style={{
          background: 'rgba(31,42,46,0.05)', borderRadius: 8, padding: '10px 14px', minWidth: 120,
        }}>
          <div style={{ fontSize: 10, opacity: 0.5, textTransform: 'uppercase', marginBottom: 3 }}>{PAY_LABELS[method] || method}</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: theme.dark }}>{val.toLocaleString('fr-MA')} MAD</div>
        </div>
      ))}
    </div>
  );
}

export default function Finance() {
  const { can } = useAuth();
  const { selectedPropertyId } = useApp();
  const [period, setPeriod] = useState('day');
  const [view, setView] = useState('global');
  const [summary, setSummary] = useState({ totals: [], byStaff: [], chartData: [] });

  if (!can('can_view_all_finances')) {
    return (
      <div style={{ textAlign: 'center', marginTop: 80, color: theme.dark, opacity: 0.4, fontSize: 16 }}>
        Accès restreint — vous n'avez pas la permission de consulter les finances.
      </div>
    );
  }

  const load = useCallback(async () => {
    if (!selectedPropertyId) return;
    const data = await invoke('finance:getSummary', { property_id: selectedPropertyId, period });
    if (!data) return;
    // data.totals and data.byStaff are raw transaction rows from Supabase
    // aggregate them client-side
    const totals = aggregateTotals(data.totals || []);
    const byStaff = aggregateByStaff(data.byStaff || []);
    setSummary({ totals, byStaff, chartData: [] });
  }, [selectedPropertyId, period]);

  useEffect(() => { load(); }, [load]);

  const totalIncome  = summary.totals.filter(t => t.type === 'income').reduce((s, t) => s + (t.total || 0), 0);
  const totalExpense = summary.totals.filter(t => t.type === 'expense').reduce((s, t) => s + (t.total || 0), 0);
  const profit       = totalIncome - totalExpense;

  // Per staff
  const staffIncome = {};
  for (const s of summary.byStaff.filter(s => s.type === 'income')) {
    staffIncome[s.recorded_by || '__'] = { full_name: s.full_name, role: s.role, income: s.total };
  }
  for (const s of summary.byStaff.filter(s => s.type === 'expense')) {
    const key = s.recorded_by || '__';
    if (!staffIncome[key]) staffIncome[key] = { full_name: s.full_name, role: s.role, income: 0 };
    staffIncome[key].expense = s.total;
  }
  const staffEntries = Object.values(staffIncome).sort((a, b) => (b.income || 0) - (a.income || 0));
  const maxStaffIncome = Math.max(...staffEntries.map(s => s.income || 0), 1);

  if (!selectedPropertyId) {
    return <div style={{ textAlign: 'center', marginTop: 60, opacity: 0.4 }}>Sélectionnez une propriété.</div>;
  }

  return (
    <div style={{ fontFamily: theme.font }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, color: theme.dark, margin: 0 }}>Finances</h1>
          <p style={{ fontSize: 13, color: theme.dark, opacity: 0.5, margin: 0, marginTop: 4 }}>Tableau de bord financier</p>
        </div>
        {/* Export CSV — not available in web version */}
        <button disabled title="Export CSV non disponible en version web" style={{
          background: 'rgba(31,42,46,0.04)', color: 'rgba(31,42,46,0.3)', borderRadius: 8,
          padding: '9px 16px', border: 'none', fontWeight: 600, fontSize: 13,
          fontFamily: theme.font, cursor: 'not-allowed',
        }}>📥 Exporter CSV</button>
      </div>

      {/* Period selector */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, background: 'rgba(31,42,46,0.06)', borderRadius: 10, padding: 4, width: 'fit-content' }}>
        {PERIODS.map(p => (
          <button key={p.key} onClick={() => setPeriod(p.key)} style={{
            padding: '7px 18px', borderRadius: 7, border: 'none',
            fontWeight: 600, fontSize: 13, fontFamily: theme.font, cursor: 'pointer',
            background: period === p.key ? theme.white : 'transparent',
            color: period === p.key ? theme.dark : 'rgba(31,42,46,0.45)',
            boxShadow: period === p.key ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
          }}>{p.label}</button>
        ))}
      </div>

      {/* View toggle */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: 'rgba(31,42,46,0.06)', borderRadius: 10, padding: 4, width: 'fit-content' }}>
        {[{ key: 'global', label: 'Vue globale' }, { key: 'bystaff', label: 'Par réceptionniste' }].map(v => (
          <button key={v.key} onClick={() => setView(v.key)} style={{
            padding: '7px 16px', borderRadius: 7, border: 'none',
            fontWeight: 600, fontSize: 13, fontFamily: theme.font, cursor: 'pointer',
            background: view === v.key ? theme.white : 'transparent',
            color: view === v.key ? theme.dark : 'rgba(31,42,46,0.45)',
            boxShadow: view === v.key ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
          }}>{v.label}</button>
        ))}
      </div>

      {/* KPI cards */}
      <div style={{ display: 'flex', gap: 14, marginBottom: 20, flexWrap: 'wrap' }}>
        <KpiCard label="Recettes MAD"  value={totalIncome}  color={theme.teal} />
        <KpiCard label="Dépenses MAD"  value={totalExpense} color={theme.coral} />
        <KpiCard label="Bénéfice MAD"  value={profit}       color={profit >= 0 ? theme.teal : theme.coral} />
      </div>

      {view === 'global' && (
        <>
          {/* Category breakdowns */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
            <div style={{ background: theme.white, borderRadius: 12, padding: 20, border: '1px solid rgba(31,42,46,0.08)' }}>
              <div style={{ fontSize: 12, fontWeight: 700, opacity: 0.5, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 14 }}>
                Recettes par catégorie
              </div>
              <CategoryBreakdown totals={summary.totals} type="income" />
            </div>
            <div style={{ background: theme.white, borderRadius: 12, padding: 20, border: '1px solid rgba(31,42,46,0.08)' }}>
              <div style={{ fontSize: 12, fontWeight: 700, opacity: 0.5, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 14 }}>
                Dépenses par catégorie
              </div>
              <CategoryBreakdown totals={summary.totals} type="expense" />
            </div>
          </div>

          {/* Payment methods */}
          <div style={{ background: theme.white, borderRadius: 12, padding: 20, border: '1px solid rgba(31,42,46,0.08)' }}>
            <div style={{ fontSize: 12, fontWeight: 700, opacity: 0.5, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 14 }}>
              Modes de paiement (recettes)
            </div>
            <PayMethodBreakdown totals={summary.totals} />
          </div>
        </>
      )}

      {view === 'bystaff' && (
        <>
          {/* Staff bar chart */}
          <div style={{ background: theme.white, borderRadius: 12, padding: 20, border: '1px solid rgba(31,42,46,0.08)', marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, opacity: 0.5, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 14 }}>
              Recettes par réceptionniste
            </div>
            {staffEntries.length === 0 ? (
              <div style={{ opacity: 0.3, fontSize: 13 }}>Aucune donnée</div>
            ) : (
              staffEntries.map((s, i) => {
                const sc = staffColor(s.role);
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                    <div style={{
                      width: 30, height: 30, borderRadius: '50%',
                      background: sc.bg, color: sc.color, border: `2px solid ${sc.color}40`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, fontWeight: 800, flexShrink: 0,
                    }}>{staffInitials(s.full_name)}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: theme.dark }}>{s.full_name || 'Inconnu'}</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: sc.color }}>{(s.income || 0).toLocaleString('fr-MA')} MAD</span>
                      </div>
                      <div style={{ height: 6, background: 'rgba(31,42,46,0.08)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{
                          height: '100%', borderRadius: 3, background: sc.color,
                          width: `${Math.round(((s.income || 0) / maxStaffIncome) * 100)}%`,
                        }} />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Per-staff cards */}
          {staffEntries.map((s, i) => {
            const sc = staffColor(s.role);
            const net = (s.income || 0) - (s.expense || 0);
            return (
              <div key={i} style={{
                background: theme.white, borderRadius: 12, padding: 18,
                border: `2px solid ${sc.color}30`, marginBottom: 14,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: '50%',
                    background: sc.bg, color: sc.color, border: `2px solid ${sc.color}40`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, fontWeight: 800,
                  }}>{staffInitials(s.full_name)}</div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: theme.dark }}>{s.full_name || 'Inconnu'}</div>
                    <div style={{ fontSize: 11, color: sc.color }}>{sc.label}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <div style={{ flex: 1, background: `${theme.teal}10`, borderRadius: 8, padding: '10px 12px' }}>
                    <div style={{ fontSize: 10, opacity: 0.5, textTransform: 'uppercase', marginBottom: 2 }}>Recettes</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: theme.teal }}>+{(s.income || 0).toLocaleString('fr-MA')} MAD</div>
                  </div>
                  <div style={{ flex: 1, background: `${theme.coral}10`, borderRadius: 8, padding: '10px 12px' }}>
                    <div style={{ fontSize: 10, opacity: 0.5, textTransform: 'uppercase', marginBottom: 2 }}>Dépenses</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: theme.coral }}>-{(s.expense || 0).toLocaleString('fr-MA')} MAD</div>
                  </div>
                  <div style={{ flex: 1, background: 'rgba(31,42,46,0.05)', borderRadius: 8, padding: '10px 12px' }}>
                    <div style={{ fontSize: 10, opacity: 0.5, textTransform: 'uppercase', marginBottom: 2 }}>Net</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: net >= 0 ? theme.teal : theme.coral }}>{net.toLocaleString('fr-MA')} MAD</div>
                  </div>
                </div>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}
