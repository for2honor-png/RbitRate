import React, { useState, useEffect, useCallback } from 'react';
import { theme } from '../theme.js';
import { useApp, useAuth } from '../App.jsx';
import { invoke } from '../db.js';
import { staffColor, staffInitials } from '../constants/staffColors.js';
import Modal from '../components/Modal.jsx';

const FIELD = {
  border: `1.5px solid rgba(31,42,46,0.2)`, borderRadius: 8,
  padding: '9px 12px', fontSize: 13, fontFamily: theme.font,
  background: theme.white, color: theme.dark, outline: 'none', width: '100%',
  boxSizing: 'border-box',
};

const INCOME_CATS = [
  { key: 'room_revenue', label: 'Chambre' },
  { key: 'fnb', label: 'F&B' },
  { key: 'extras', label: 'Extras' },
  { key: 'other', label: 'Autre' },
];
const EXPENSE_CATS = [
  { key: 'supplies', label: 'Fournitures' },
  { key: 'maintenance', label: 'Maintenance' },
  { key: 'other', label: 'Autre' },
];
const PAY_MODES = [
  { key: 'cash', label: 'Espèces' },
  { key: 'card', label: 'Carte' },
  { key: 'bank_transfer', label: 'Virement' },
];
const CAT_LABELS = {
  room_revenue: 'Chambre', fnb: 'F&B', laundry: 'Blanchisserie',
  transport: 'Transport', extras: 'Extras', commission: 'Commission',
  supplies: 'Fournitures', maintenance: 'Maintenance', salary: 'Salaire',
  utilities: 'Charges', ota_fee: 'Frais OTA', other: 'Autre',
};
const PAY_LABELS = { cash: 'Espèces', card: 'Carte', bank_transfer: 'Virement', ota_collected: 'OTA', agency: 'Agence' };

function Avatar({ name, role, size = 36 }) {
  const sc = staffColor(role);
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: sc.bg, color: sc.color, border: `2px solid ${sc.color}40`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.35, fontWeight: 800, flexShrink: 0,
    }}>
      {staffInitials(name)}
    </div>
  );
}

function TxnRow({ txn }) {
  const isIncome = txn.type === 'income';
  const time = txn.created_at
    ? (txn.created_at.split('T')[1]?.slice(0, 5) || txn.created_at.slice(11, 16))
    : '';
  const staffName = txn.staff?.full_name || txn.full_name || '?';
  const staffRole = txn.staff?.role || txn.role;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '10px 14px', background: theme.white,
      borderRadius: 8, borderLeft: `4px solid ${isIncome ? theme.teal : theme.coral}`,
      marginBottom: 6,
    }}>
      <Avatar name={staffName} role={staffRole} size={28} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: theme.dark, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {txn.description || CAT_LABELS[txn.category] || txn.category}
        </div>
        <div style={{ fontSize: 11, color: theme.dark, opacity: 0.45, marginTop: 1 }}>
          {staffName.split(' ')[0]} · {time} · {CAT_LABELS[txn.category] || txn.category} · {PAY_LABELS[txn.payment_method] || txn.payment_method}
        </div>
      </div>
      <div style={{ fontSize: 14, fontWeight: 700, flexShrink: 0, color: isIncome ? theme.teal : theme.coral }}>
        {isIncome ? '+' : '-'}{(txn.amount || 0).toLocaleString('fr-MA')} MAD
      </div>
    </div>
  );
}

function CloseShiftModal({ shift, onConfirm, onClose }) {
  const [step, setStep] = useState(1);
  const [closingCash, setClosingCash] = useState('');
  const [result, setResult] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const income = shift._cashIncome || 0;
  const expense = shift._cashExpense || 0;
  const expectedCash = (shift.opening_cash || 0) + income - expense;
  const closingVal = parseFloat(closingCash) || 0;
  const discrepancy = closingVal - expectedCash;

  async function handleClose() {
    setSaving(true);
    const res = await invoke('shifts:close', {
      shift_id: shift.id,
      closing_cash: closingVal,
      expected_cash: expectedCash,
      discrepancy,
    });
    setSaving(false);
    // HANDLERS returns true (patch success) not {ok: true}
    if (res === true || res) {
      setResult({ discrepancy });
      setStep(2);
    } else {
      setError('Erreur lors de la fermeture du shift');
    }
  }

  return (
    <Modal title="Fermer le Shift" onClose={onClose} width={400}>
      {step === 1 && (
        <>
          <div style={{ background: theme.cream, borderRadius: 10, padding: 14, marginBottom: 16 }}>
            {[
              ['Caisse ouverture', `${(shift.opening_cash || 0).toLocaleString('fr-MA')} MAD`, theme.dark],
              ['Recettes cash', `+${income.toLocaleString('fr-MA')} MAD`, theme.teal],
              ['Dépenses cash', `-${expense.toLocaleString('fr-MA')} MAD`, theme.coral],
              ['Caisse attendue', `${expectedCash.toLocaleString('fr-MA')} MAD`, theme.dark],
            ].map(([label, val, color]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
                <span style={{ color: theme.dark, opacity: 0.65 }}>{label}</span>
                <span style={{ fontWeight: 700, color }}>{val}</span>
              </div>
            ))}
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, opacity: 0.55, textTransform: 'uppercase', marginBottom: 5 }}>
              Montant réel en caisse (MAD)
            </label>
            <input
              type="number" min="0" step="10"
              value={closingCash}
              onChange={e => setClosingCash(e.target.value)}
              placeholder="0"
              style={{ ...FIELD, fontSize: 18, fontWeight: 700 }}
              autoFocus
            />
          </div>
          {error && <div style={{ color: theme.coral, fontSize: 12, marginBottom: 10 }}>{error}</div>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onClose} style={{
              flex: 1, background: 'rgba(31,42,46,0.06)', color: theme.dark, borderRadius: 8,
              padding: '10px 0', border: 'none', fontWeight: 600, fontSize: 13,
              fontFamily: theme.font, cursor: 'pointer',
            }}>Annuler</button>
            <button onClick={handleClose} disabled={saving || !closingCash} style={{
              flex: 2, background: theme.coral, color: theme.white, borderRadius: 8,
              padding: '10px 0', border: 'none', fontWeight: 700, fontSize: 13,
              fontFamily: theme.font,
              cursor: (saving || !closingCash) ? 'not-allowed' : 'pointer',
              opacity: (saving || !closingCash) ? 0.6 : 1,
            }}>Confirmer fermeture</button>
          </div>
        </>
      )}

      {step === 2 && result && (() => {
        const d = result.discrepancy;
        const exact = d === 0;
        const surplus = d > 0;
        return (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div style={{ fontSize: 44, marginBottom: 14 }}>{exact || surplus ? '✅' : '⚠️'}</div>
            <div style={{ fontSize: 17, fontWeight: 700, color: exact || surplus ? theme.teal : theme.coral }}>
              {exact
                ? 'Caisse correcte — aucun écart'
                : surplus
                ? `+${d.toLocaleString('fr-MA')} MAD excédentaire`
                : `${d.toLocaleString('fr-MA')} MAD manquant`}
            </div>
            <button onClick={onConfirm} style={{
              marginTop: 24, width: '100%', background: theme.teal, color: theme.white,
              borderRadius: 8, padding: '12px 0', border: 'none', fontWeight: 700, fontSize: 14,
              fontFamily: theme.font, cursor: 'pointer',
            }}>OK — fermer le shift</button>
          </div>
        );
      })()}
    </Modal>
  );
}

function AddTxnModal({ shift, defaultType, onConfirm, onClose }) {
  const { staff } = useAuth();
  const [type, setType] = useState(defaultType || 'income');
  const [category, setCategory] = useState('room_revenue');
  const [amount, setAmount] = useState('');
  const [payMode, setPayMode] = useState('cash');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const cats = type === 'income' ? INCOME_CATS : EXPENSE_CATS;
  useEffect(() => { setCategory(cats[0].key); }, [type]);

  async function handleSave() {
    if (!amount || parseFloat(amount) <= 0) { setError('Montant requis.'); return; }
    setSaving(true);
    const result = await invoke('transactions:create', {
      shift_id: shift.id,
      property_id: shift.property_id,
      type, category,
      amount: parseFloat(amount),
      payment_method: payMode,
      description: note.trim() || null,
      recorded_by: staff?.id || null,
    });
    setSaving(false);
    // post() returns the created array or object; truthy means success
    if (result) onConfirm();
    else setError('Erreur lors de l\'enregistrement');
  }

  return (
    <Modal title={type === 'income' ? '+ Nouvelle Recette' : '− Nouvelle Dépense'} onClose={onClose} width={400}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        {[['income', 'Recette'], ['expense', 'Dépense']].map(([t, l]) => (
          <button key={t} onClick={() => setType(t)} style={{
            flex: 1, padding: '8px 0', borderRadius: 8, border: 'none',
            fontWeight: 700, fontSize: 13, fontFamily: theme.font, cursor: 'pointer',
            background: type === t ? (t === 'income' ? theme.teal : theme.coral) : 'rgba(31,42,46,0.06)',
            color: type === t ? theme.white : theme.dark,
          }}>{l}</button>
        ))}
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={{ display: 'block', fontSize: 11, fontWeight: 700, opacity: 0.55, textTransform: 'uppercase', marginBottom: 5 }}>Catégorie</label>
        <select value={category} onChange={e => setCategory(e.target.value)} style={{ ...FIELD, cursor: 'pointer' }}>
          {cats.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
        </select>
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={{ display: 'block', fontSize: 11, fontWeight: 700, opacity: 0.55, textTransform: 'uppercase', marginBottom: 5 }}>Montant (MAD)</label>
        <input type="number" min="0" step="10" value={amount}
          onChange={e => setAmount(e.target.value)} placeholder="0"
          style={{ ...FIELD, fontSize: 16, fontWeight: 700 }} autoFocus />
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={{ display: 'block', fontSize: 11, fontWeight: 700, opacity: 0.55, textTransform: 'uppercase', marginBottom: 5 }}>Mode</label>
        <div style={{ display: 'flex', gap: 6 }}>
          {PAY_MODES.map(pm => (
            <button key={pm.key} onClick={() => setPayMode(pm.key)} style={{
              flex: 1, padding: '8px 0', borderRadius: 7, border: 'none',
              fontWeight: 600, fontSize: 12, fontFamily: theme.font, cursor: 'pointer',
              background: payMode === pm.key ? theme.dark : 'rgba(31,42,46,0.07)',
              color: payMode === pm.key ? theme.white : theme.dark,
            }}>{pm.label}</button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', fontSize: 11, fontWeight: 700, opacity: 0.55, textTransform: 'uppercase', marginBottom: 5 }}>Note (optionnel)</label>
        <input value={note} onChange={e => setNote(e.target.value)}
          placeholder="Ex: Ch.101 — M. Alami" style={FIELD} />
      </div>

      {error && <div style={{ color: theme.coral, fontSize: 12, marginBottom: 10 }}>{error}</div>}
      <button onClick={handleSave} disabled={saving} style={{
        width: '100%', background: type === 'income' ? theme.teal : theme.coral, color: theme.white,
        borderRadius: 8, padding: '11px 0', border: 'none', fontWeight: 700, fontSize: 14,
        fontFamily: theme.font, cursor: saving ? 'wait' : 'pointer', opacity: saving ? 0.7 : 1,
      }}>Enregistrer</button>
    </Modal>
  );
}

export default function Shifts() {
  const { selectedPropertyId } = useApp();
  const { staff } = useAuth();
  const [activeShift, setActiveShift] = useState(null);
  const [txns, setTxns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openingCash, setOpeningCash] = useState('');
  const [opening, setOpening] = useState(false);
  const [openError, setOpenError] = useState('');
  const [closingShift, setClosingShift] = useState(null);
  const [addTxnType, setAddTxnType] = useState(null);
  const [toast, setToast] = useState(null);

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(null), 3000); }

  const load = useCallback(async () => {
    if (!selectedPropertyId) return;
    const [shifts, recent] = await Promise.all([
      invoke('shifts:getActive', { property_id: selectedPropertyId }),
      invoke('finance:getRecentTransactions', { property_id: selectedPropertyId, limit: 200 }),
    ]);
    const shift = shifts?.[0] || null;
    setLoading(false);
    if (!shift) { setActiveShift(null); setTxns([]); return; }
    const shiftTxns = (recent || []).filter(t => t.shift_id === shift.id);
    const cashIncome  = shiftTxns.filter(t => t.type === 'income'  && t.payment_method === 'cash').reduce((s, t) => s + t.amount, 0);
    const cashExpense = shiftTxns.filter(t => t.type === 'expense' && t.payment_method === 'cash').reduce((s, t) => s + t.amount, 0);
    setActiveShift({ ...shift, _cashIncome: cashIncome, _cashExpense: cashExpense });
    setTxns(shiftTxns);
  }, [selectedPropertyId]);

  useEffect(() => { setLoading(true); load(); }, [load]);

  async function handleOpen() {
    if (!staff?.id) { setOpenError('Aucun utilisateur connecté.'); return; }
    setOpening(true); setOpenError('');
    const result = await invoke('shifts:open', {
      staff_id: staff.id,
      property_id: selectedPropertyId,
      opening_cash: parseFloat(openingCash) || 0,
    });
    setOpening(false);
    // post() returns array with created row; check for truthy
    if (result) { setOpeningCash(''); showToast('✓ Shift ouvert'); await load(); }
    else setOpenError('Erreur lors de l\'ouverture du shift');
  }

  if (!selectedPropertyId) {
    return <div style={{ textAlign: 'center', marginTop: 60, opacity: 0.4 }}>Sélectionnez une propriété.</div>;
  }
  if (loading) {
    return <div style={{ textAlign: 'center', marginTop: 60, opacity: 0.4 }}>Chargement...</div>;
  }

  const income = activeShift?._cashIncome || 0;
  const expense = activeShift?._cashExpense || 0;
  const expectedCash = activeShift ? (activeShift.opening_cash || 0) + income - expense : 0;
  const openedAt = activeShift?.opened_at ? new Date(activeShift.opened_at) : null;
  const elapsed = openedAt ? Math.floor((Date.now() - openedAt.getTime()) / 60000) : 0;
  const timeStr = openedAt ? openedAt.toLocaleTimeString('fr-MA', { hour: '2-digit', minute: '2-digit' }) : '—';
  const durationStr = openedAt ? `${Math.floor(elapsed / 60)}h ${elapsed % 60}m` : '';

  return (
    <div style={{ fontFamily: theme.font, maxWidth: 640, margin: '0 auto' }}>
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: '#16a34a', color: theme.white, borderRadius: 10,
          padding: '12px 24px', fontSize: 13, fontWeight: 700, zIndex: 9999,
        }}>{toast}</div>
      )}

      <h1 style={{ fontSize: 22, fontWeight: 900, color: theme.dark, margin: '0 0 24px' }}>Shifts</h1>

      {!activeShift ? (
        /* ── State A: No shift open ── */
        <div style={{ background: theme.white, borderRadius: 16, padding: 32, textAlign: 'center', maxWidth: 440, margin: '0 auto' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>😴</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: theme.dark, marginBottom: 8 }}>Aucun shift ouvert</div>
          <div style={{ fontSize: 13, color: theme.dark, opacity: 0.55, marginBottom: 24 }}>
            Ouvrez un shift pour commencer à enregistrer des paiements.
          </div>
          <div style={{ textAlign: 'left', marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, opacity: 0.55, textTransform: 'uppercase', marginBottom: 5 }}>
              Caisse d'ouverture (MAD)
            </label>
            <input
              type="number" min="0" step="10"
              value={openingCash}
              onChange={e => setOpeningCash(e.target.value)}
              placeholder="0"
              style={FIELD}
              onKeyDown={e => e.key === 'Enter' && handleOpen()}
            />
          </div>
          {openError && <div style={{ color: theme.coral, fontSize: 12, marginBottom: 10, textAlign: 'left' }}>{openError}</div>}
          <button onClick={handleOpen} disabled={opening} style={{
            width: '100%', background: theme.teal, color: theme.white, borderRadius: 8,
            padding: '12px 0', border: 'none', fontWeight: 700, fontSize: 14,
            fontFamily: theme.font, cursor: opening ? 'wait' : 'pointer', opacity: opening ? 0.7 : 1,
          }}>Ouvrir le Shift</button>
          <div style={{
            marginTop: 24, background: `${theme.teal}14`, borderRadius: 10,
            padding: 14, textAlign: 'left', fontSize: 12, color: theme.dark, lineHeight: 1.6,
          }}>
            💡 Un shift représente une session de travail. Ouvrez-en un en début de service,
            enregistrez tous les paiements dessous, puis fermez-le en fin de service pour faire la caisse.
          </div>
        </div>
      ) : (
        /* ── State B: Shift open ── */
        <>
          <div style={{ background: '#1f2a2e', borderRadius: 16, padding: 22, marginBottom: 20, color: theme.white }}>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: '#4ade80', marginBottom: 6 }}>
                🟢 SHIFT EN COURS
              </div>
              <div style={{ fontSize: 16, fontWeight: 800 }}>{activeShift.staff?.full_name || activeShift.full_name || '?'}</div>
              <div style={{ fontSize: 12, opacity: 0.5, marginTop: 3 }}>
                Ouvert à {timeStr} · {durationStr}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10, marginBottom: 18 }}>
              {[
                { label: 'Caisse ouverture', val: `${(activeShift.opening_cash || 0).toLocaleString('fr-MA')} MAD`, color: 'rgba(255,255,255,0.75)' },
                { label: 'Recettes cash', val: `+${income.toLocaleString('fr-MA')} MAD`, color: '#4ade80' },
                { label: 'Dépenses cash', val: `-${expense.toLocaleString('fr-MA')} MAD`, color: '#f87171' },
                { label: 'Caisse attendue', val: `${expectedCash.toLocaleString('fr-MA')} MAD`, color: '#e5e7eb' },
              ].map(({ label, val, color }) => (
                <div key={label} style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 8, padding: '10px 12px' }}>
                  <div style={{ fontSize: 9, opacity: 0.45, textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 4 }}>{label}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color }}>{val}</div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setAddTxnType('income')} style={{
                flex: 1, background: '#16a34a25', color: '#4ade80', borderRadius: 8,
                padding: '9px 0', border: '1px solid #4ade8030', fontWeight: 700, fontSize: 13,
                fontFamily: theme.font, cursor: 'pointer',
              }}>+ Recette</button>
              <button onClick={() => setAddTxnType('expense')} style={{
                flex: 1, background: '#ef444425', color: '#f87171', borderRadius: 8,
                padding: '9px 0', border: '1px solid #f8717130', fontWeight: 700, fontSize: 13,
                fontFamily: theme.font, cursor: 'pointer',
              }}>− Dépense</button>
              <button onClick={() => setClosingShift(activeShift)} style={{
                background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.65)', borderRadius: 8,
                padding: '9px 16px', border: '1px solid rgba(255,255,255,0.15)', fontWeight: 600, fontSize: 12,
                fontFamily: theme.font, cursor: 'pointer',
              }}>Fermer le Shift</button>
            </div>
          </div>

          {txns.length > 0 ? (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.4, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
                Transactions ({txns.length})
              </div>
              {txns.map(t => <TxnRow key={t.id} txn={t} />)}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '28px 0', fontSize: 13, color: theme.dark, opacity: 0.38 }}>
              Aucune transaction pour ce shift.
            </div>
          )}
        </>
      )}

      {closingShift && (
        <CloseShiftModal
          shift={closingShift}
          onConfirm={async () => { setClosingShift(null); showToast('✓ Shift fermé'); await load(); }}
          onClose={() => setClosingShift(null)}
        />
      )}

      {addTxnType && activeShift && (
        <AddTxnModal
          shift={activeShift}
          defaultType={addTxnType}
          onConfirm={async () => { setAddTxnType(null); showToast('✓ Transaction enregistrée'); await load(); }}
          onClose={() => setAddTxnType(null)}
        />
      )}
    </div>
  );
}
