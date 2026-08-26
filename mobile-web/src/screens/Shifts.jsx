import { useState, useEffect, useCallback } from 'react';
import { api } from '../api';
import { C } from '../theme';

const INCOME_CATS = ['Chambre', 'F&B', 'Extras', 'Autre'];
const EXPENSE_CATS = ['Fournitures', 'Maintenance', 'Autre'];

const iStyle = {
  width: '100%', padding: '13px 14px', borderRadius: 12,
  border: `1.5px solid ${C.border}`, background: C.white,
  fontSize: 15, marginBottom: 14, boxSizing: 'border-box',
  fontFamily: 'inherit',
};

const btnPrimary = (bg) => ({
  width: '100%', padding: 16, background: bg, color: C.white,
  borderRadius: 14, fontWeight: 800, fontSize: 16, border: 'none',
  cursor: 'pointer', marginBottom: 10, fontFamily: 'inherit',
});

function fmt(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleString('fr-MA', { hour: '2-digit', minute: '2-digit' });
}

export default function Shifts({ ctx }) {
  const { property, staff } = ctx;
  const [activeShift, setActiveShift] = useState(null);
  const [txns, setTxns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openCash, setOpenCash] = useState('');
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState('');
  const [closeModal, setCloseModal] = useState(false);
  const [txModal, setTxModal] = useState(false);
  const [defaultTxType, setDefaultTxType] = useState('income');

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 2500); };

  const load = useCallback(async () => {
    if (!property?.id) return;
    const shifts = await api.getActiveShifts(property.id).catch(() => []);
    const shift = (Array.isArray(shifts) ? shifts : [])[0] || null;
    if (!shift) { setActiveShift(null); setTxns([]); setLoading(false); return; }
    const t = await api.getTransactions(shift.id).catch(() => []);
    const txList = Array.isArray(t) ? t : [];
    const cashIncome  = txList.filter(x => x.type === 'income'  && x.payment_method === 'cash').reduce((s, x) => s + (x.amount || 0), 0);
    const cashExpense = txList.filter(x => x.type === 'expense' && x.payment_method === 'cash').reduce((s, x) => s + (x.amount || 0), 0);
    setActiveShift({ ...shift, _cashIncome: cashIncome, _cashExpense: cashExpense });
    setTxns(txList);
    setLoading(false);
  }, [property?.id]);

  useEffect(() => { setLoading(true); load(); }, [load]);

  const doOpenShift = async () => {
    setBusy(true);
    await api.openShift({
      property_id: property.id,
      staff_id: staff?.id || null,
      opening_cash: parseFloat(openCash) || 0,
    }).catch(() => {});
    setOpenCash('');
    showToast('Shift ouvert ✓');
    await load();
    setBusy(false);
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '60px 0', color: C.gray }}>Chargement...</div>;
  }

  const income = activeShift?._cashIncome || 0;
  const expense = activeShift?._cashExpense || 0;
  const expectedCash = activeShift ? (activeShift.opening_cash || 0) + income - expense : 0;
  const openTime = activeShift?.opened_at ? fmt(activeShift.opened_at) : '—';

  return (
    <div style={{ padding: '20px 16px', paddingBottom: 100 }}>
      <div style={{ fontSize: 18, fontWeight: 800, color: C.dark, marginBottom: 20 }}>Shifts</div>

      {!activeShift ? (
        /* ── State A: No shift ── */
        <div style={{ background: C.white, borderRadius: 18, padding: 24, textAlign: 'center' }}>
          <div style={{ fontSize: 44, marginBottom: 12 }}>😴</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: C.dark, marginBottom: 6 }}>Aucun shift ouvert</div>
          <div style={{ fontSize: 14, color: C.gray, marginBottom: 24 }}>
            Ouvrez un shift pour commencer à enregistrer des paiements.
          </div>

          <div style={{ textAlign: 'left', marginBottom: 14 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: C.gray, textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
              Caisse d'ouverture (MAD)
            </label>
            <input type="number" min="0" value={openCash}
              onChange={e => setOpenCash(e.target.value)}
              placeholder="0" style={iStyle} autoFocus />
          </div>

          <button onClick={doOpenShift} disabled={busy} style={btnPrimary(C.teal)}>
            {busy ? '...' : 'Ouvrir le Shift'}
          </button>

          <div style={{
            marginTop: 8, background: `${C.teal}12`, borderRadius: 12,
            padding: 14, textAlign: 'left', fontSize: 13, color: C.dark, lineHeight: 1.6,
          }}>
            💡 Un shift représente une session de travail. Ouvrez-en un en début de service,
            enregistrez tous les paiements dessous, puis fermez-le en fin de service pour faire la caisse.
          </div>
        </div>
      ) : (
        /* ── State B: Shift open ── */
        <>
          {/* Shift header card */}
          <div style={{ background: C.dark, borderRadius: 18, padding: 20, marginBottom: 16, color: C.cream }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#4ade80', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>
              🟢 SHIFT EN COURS
            </div>
            <div style={{ fontWeight: 800, fontSize: 17, marginBottom: 2 }}>
              {activeShift.staff?.full_name || staff?.full_name || 'Staff'}
            </div>
            <div style={{ fontSize: 12, opacity: 0.5, marginBottom: 18 }}>
              Ouvert à {openTime}
            </div>

            {/* Summary */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 18 }}>
              {[
                { label: 'Caisse ouverture', val: `${(activeShift.opening_cash || 0).toLocaleString('fr-MA')} MAD`, color: 'rgba(255,255,255,0.7)' },
                { label: 'Caisse attendue', val: `${expectedCash.toLocaleString('fr-MA')} MAD`, color: '#e5e7eb' },
                { label: 'Recettes cash', val: `+${income.toLocaleString('fr-MA')} MAD`, color: '#4ade80' },
                { label: 'Dépenses cash', val: `-${expense.toLocaleString('fr-MA')} MAD`, color: '#f87171' },
              ].map(({ label, val, color }) => (
                <div key={label} style={{ background: 'rgba(255,255,255,0.07)', borderRadius: 10, padding: '10px 14px' }}>
                  <div style={{ fontSize: 10, opacity: 0.45, textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
                  <div style={{ fontWeight: 700, fontSize: 14, color }}>{val}</div>
                </div>
              ))}
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
              <button onClick={() => { setDefaultTxType('income'); setTxModal(true); }} style={{
                flex: 1, padding: 14, background: '#16a34a25', color: '#4ade80',
                borderRadius: 12, fontWeight: 800, fontSize: 14, border: '1px solid #4ade8035',
                cursor: 'pointer', fontFamily: 'inherit',
              }}>+ Recette</button>
              <button onClick={() => { setDefaultTxType('expense'); setTxModal(true); }} style={{
                flex: 1, padding: 14, background: '#ef444420', color: '#f87171',
                borderRadius: 12, fontWeight: 800, fontSize: 14, border: '1px solid #f8717130',
                cursor: 'pointer', fontFamily: 'inherit',
              }}>− Dépense</button>
            </div>
            <button onClick={() => setCloseModal(true)} style={{
              width: '100%', padding: 13, background: 'rgba(255,255,255,0.08)',
              color: 'rgba(255,255,255,0.65)', borderRadius: 12, fontWeight: 700, fontSize: 14,
              border: '1px solid rgba(255,255,255,0.15)', cursor: 'pointer', fontFamily: 'inherit',
            }}>Fermer le Shift</button>
          </div>

          {/* Transaction list */}
          {txns.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0', color: C.gray, fontSize: 13 }}>
              Aucune transaction pour ce shift.
            </div>
          ) : (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.gray, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>
                Transactions ({txns.length})
              </div>
              {txns.map(t => (
                <div key={t.id} style={{
                  display: 'flex', alignItems: 'center', padding: '12px 14px',
                  background: C.white, borderRadius: 12, marginBottom: 8,
                  borderLeft: `4px solid ${t.type === 'income' ? '#4ade80' : C.coral}`,
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: C.dark }}>
                      {t.description || t.category}
                    </div>
                    <div style={{ fontSize: 11, color: C.gray, marginTop: 2 }}>
                      {t.payment_method === 'cash' ? 'Espèces' : t.payment_method === 'card' ? 'Carte' : 'Virement'}
                    </div>
                  </div>
                  <div style={{ fontWeight: 800, fontSize: 15, color: t.type === 'income' ? '#16a34a' : C.coral }}>
                    {t.type === 'income' ? '+' : '-'}{(t.amount || 0).toLocaleString('fr-MA')} MAD
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Close Shift Modal ── */}
      {closeModal && <CloseModal
        shift={activeShift}
        expectedCash={expectedCash}
        onClose={() => setCloseModal(false)}
        onConfirm={async () => { setCloseModal(false); showToast('Shift fermé ✓'); await load(); }}
      />}

      {/* ── Add Transaction Modal ── */}
      {txModal && <AddTxModal
        shiftId={activeShift?.id}
        propertyId={property?.id}
        staffId={staff?.id}
        defaultType={defaultTxType}
        onClose={() => setTxModal(false)}
        onConfirm={async () => { setTxModal(false); showToast('Transaction ajoutée ✓'); await load(); }}
      />}

      {/* Toast */}
      {toast ? (
        <div style={{
          position: 'fixed', bottom: 90, left: '50%', transform: 'translateX(-50%)',
          background: C.dark, color: C.white, padding: '10px 22px',
          borderRadius: 24, fontSize: 14, fontWeight: 600, zIndex: 300, whiteSpace: 'nowrap',
        }}>{toast}</div>
      ) : null}
    </div>
  );
}

function CloseModal({ shift, expectedCash, onClose, onConfirm }) {
  const [step, setStep] = useState(1);
  const [closingCash, setClosingCash] = useState('');
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);

  async function handleClose() {
    setBusy(true);
    const cc = parseFloat(closingCash) || 0;
    const discrepancy = cc - expectedCash;
    await api.closeShift(shift.id, cc, expectedCash, discrepancy).catch(() => {});
    setResult({ discrepancy });
    setStep(2);
    setBusy(false);
  }

  return (
    <BottomSheet title="Fermer le Shift" onClose={onClose}>
      {step === 1 && (
        <>
          <div style={{ background: '#f7f5f0', borderRadius: 12, padding: 14, marginBottom: 16 }}>
            {[
              ['Caisse ouverture', `${(shift.opening_cash || 0).toLocaleString('fr-MA')} MAD`, C.dark],
              ['Recettes cash', `+${(shift._cashIncome || 0).toLocaleString('fr-MA')} MAD`, '#16a34a'],
              ['Dépenses cash', `-${(shift._cashExpense || 0).toLocaleString('fr-MA')} MAD`, C.coral],
              ['Caisse attendue', `${expectedCash.toLocaleString('fr-MA')} MAD`, C.dark],
            ].map(([label, val, color]) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 14 }}>
                <span style={{ color: C.gray }}>{label}</span>
                <span style={{ fontWeight: 700, color }}>{val}</span>
              </div>
            ))}
          </div>
          <label style={{ fontSize: 11, fontWeight: 700, color: C.gray, textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>
            Montant réel en caisse (MAD)
          </label>
          <input type="number" min="0" value={closingCash}
            onChange={e => setClosingCash(e.target.value)}
            placeholder="0" style={{ ...iStyle, fontSize: 18, fontWeight: 700 }} autoFocus />
          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button onClick={onClose} style={{
              flex: 1, padding: 14, background: '#f0ece6', color: C.dark,
              borderRadius: 12, fontWeight: 700, fontSize: 15, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
            }}>Annuler</button>
            <button onClick={handleClose} disabled={busy || !closingCash} style={{
              flex: 2, padding: 14, background: C.coral, color: C.white,
              borderRadius: 12, fontWeight: 800, fontSize: 15, border: 'none',
              cursor: (busy || !closingCash) ? 'not-allowed' : 'pointer',
              opacity: (busy || !closingCash) ? 0.6 : 1, fontFamily: 'inherit',
            }}>Confirmer fermeture</button>
          </div>
        </>
      )}

      {step === 2 && result !== null && (() => {
        const d = result.discrepancy;
        const exact = d === 0;
        const surplus = d > 0;
        return (
          <div style={{ textAlign: 'center', padding: '16px 0 8px' }}>
            <div style={{ fontSize: 52, marginBottom: 16 }}>{exact || surplus ? '✅' : '⚠️'}</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: exact || surplus ? '#16a34a' : C.coral, marginBottom: 8 }}>
              {exact
                ? 'Caisse correcte — aucun écart'
                : surplus
                ? `+${d.toLocaleString('fr-MA')} MAD excédentaire`
                : `${d.toLocaleString('fr-MA')} MAD manquant`}
            </div>
            <button onClick={onConfirm} style={{ ...btnPrimary(C.teal), marginTop: 20 }}>
              OK — fermer le shift
            </button>
          </div>
        );
      })()}
    </BottomSheet>
  );
}

function AddTxModal({ shiftId, propertyId, staffId, defaultType, onClose, onConfirm }) {
  const [type, setType] = useState(defaultType || 'income');
  const [category, setCategory] = useState(INCOME_CATS[0]);
  const [amount, setAmount] = useState('');
  const [payMethod, setPayMethod] = useState('cash');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const cats = type === 'income' ? INCOME_CATS : EXPENSE_CATS;
  const handleTypeChange = (t) => { setType(t); setCategory((t === 'income' ? INCOME_CATS : EXPENSE_CATS)[0]); };

  async function handleSave() {
    if (!amount || isNaN(parseFloat(amount))) return;
    setBusy(true);
    await api.addTransaction({
      shift_id: shiftId,
      property_id: propertyId,
      type, category,
      amount: parseFloat(amount),
      payment_method: payMethod,
      description: note.trim() || null,
      recorded_by: staffId || null,
    });
    setBusy(false);
    onConfirm();
  }

  return (
    <BottomSheet title={type === 'income' ? '+ Recette' : '− Dépense'} onClose={onClose}>
      {/* Type toggle */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {[['income', 'Recette'], ['expense', 'Dépense']].map(([v, l]) => (
          <button key={v} onClick={() => handleTypeChange(v)} style={{
            flex: 1, padding: 13, borderRadius: 12, fontWeight: 800, fontSize: 14, border: 'none',
            background: type === v ? (v === 'income' ? C.teal : C.coral) : '#f0ece6',
            color: type === v ? C.white : C.gray, cursor: 'pointer', fontFamily: 'inherit',
          }}>{l}</button>
        ))}
      </div>

      <label style={{ fontSize: 11, fontWeight: 700, color: C.gray, textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Catégorie</label>
      <select value={category} onChange={e => setCategory(e.target.value)} style={iStyle}>
        {cats.map(c => <option key={c} value={c}>{c}</option>)}
      </select>

      <label style={{ fontSize: 11, fontWeight: 700, color: C.gray, textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Montant (MAD)</label>
      <input type="number" min="0" value={amount}
        onChange={e => setAmount(e.target.value)}
        placeholder="0" style={{ ...iStyle, fontSize: 18, fontWeight: 700 }} autoFocus />

      <label style={{ fontSize: 11, fontWeight: 700, color: C.gray, textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Mode</label>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        {[['cash', 'Espèces'], ['card', 'Carte'], ['bank_transfer', 'Virement']].map(([v, l]) => (
          <button key={v} onClick={() => setPayMethod(v)} style={{
            flex: 1, padding: 12, borderRadius: 10, fontWeight: 700, fontSize: 13, border: 'none',
            background: payMethod === v ? C.dark : '#f0ece6',
            color: payMethod === v ? C.white : C.gray, cursor: 'pointer', fontFamily: 'inherit',
          }}>{l}</button>
        ))}
      </div>

      <label style={{ fontSize: 11, fontWeight: 700, color: C.gray, textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>Note (optionnel)</label>
      <input value={note} onChange={e => setNote(e.target.value)}
        placeholder="Ex: Chambre 101 — M. Alami" style={iStyle} />

      <button onClick={handleSave} disabled={busy || !amount} style={{
        ...btnPrimary(type === 'income' ? C.teal : C.coral),
        opacity: (busy || !amount) ? 0.6 : 1,
        cursor: (busy || !amount) ? 'not-allowed' : 'pointer',
      }}>{busy ? '...' : 'Enregistrer'}</button>
    </BottomSheet>
  );
}

function BottomSheet({ title, onClose, children }) {
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 200,
      display: 'flex', alignItems: 'flex-end',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: C.white, borderRadius: '20px 20px 0 0',
        width: '100%', maxWidth: 430, margin: '0 auto',
        padding: '20px 20px 44px',
        maxHeight: '90vh', overflowY: 'auto',
      }}>
        <div style={{ width: 36, height: 4, background: C.border, borderRadius: 2, margin: '0 auto 16px' }} />
        <div style={{ fontSize: 17, fontWeight: 800, color: C.dark, marginBottom: 20 }}>{title}</div>
        {children}
      </div>
    </div>
  );
}
