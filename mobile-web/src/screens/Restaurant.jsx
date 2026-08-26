import React, { useState, useEffect, useCallback } from 'react';
import { theme } from '../theme.js';
import { useApp } from '../App.jsx';
import { invoke, on } from '../db.js';

// ── Shared styles ─────────────────────────────────────────────────────────

const FIELD = {
  border: `1.5px solid rgba(31,42,46,0.18)`, borderRadius: 8,
  padding: '9px 12px', fontSize: 13, fontFamily: theme.font,
  background: theme.white, color: theme.dark, outline: 'none', width: '100%',
  boxSizing: 'border-box',
};

const BTN_PRIMARY = {
  background: theme.teal, color: theme.white, border: 'none', borderRadius: 8,
  padding: '9px 18px', fontWeight: 700, fontSize: 13, fontFamily: theme.font,
  cursor: 'pointer',
};

const BTN_GHOST = {
  background: 'rgba(31,42,46,0.07)', color: theme.dark, border: 'none', borderRadius: 8,
  padding: '9px 18px', fontWeight: 600, fontSize: 13, fontFamily: theme.font,
  cursor: 'pointer',
};

const BTN_DANGER = {
  background: `${theme.coral}15`, color: theme.coral, border: 'none', borderRadius: 8,
  padding: '7px 12px', fontWeight: 600, fontSize: 12, fontFamily: theme.font,
  cursor: 'pointer',
};

function Label({ children }) {
  return (
    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: theme.dark, opacity: 0.55, marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.4 }}>
      {children}
    </label>
  );
}

function SubTab({ active, onClick, children }) {
  return (
    <button onClick={onClick} style={{
      padding: '8px 18px', border: 'none', background: 'transparent', cursor: 'pointer',
      fontFamily: theme.font, fontSize: 13, fontWeight: active ? 700 : 500,
      color: active ? theme.teal : `${theme.dark}88`,
      borderBottom: active ? `2px solid ${theme.teal}` : '2px solid transparent',
    }}>
      {children}
    </button>
  );
}

function Toggle({ value, onChange }) {
  return (
    <div onClick={() => onChange(!value)} style={{
      width: 40, height: 22, borderRadius: 11, cursor: 'pointer',
      background: value ? theme.teal : 'rgba(31,42,46,0.18)', position: 'relative', transition: 'background 0.2s', flexShrink: 0,
    }}>
      <div style={{
        position: 'absolute', top: 3, left: value ? 21 : 3,
        width: 16, height: 16, borderRadius: '50%', background: 'white',
        transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
      }} />
    </div>
  );
}

// ── Status helpers ────────────────────────────────────────────────────────

const STATUS_META = {
  pending:     { label: 'En attente',      color: '#f59e0b', next: 'in_progress', nextLabel: 'Démarrer ▶' },
  in_progress: { label: 'En préparation',  color: '#3b82f6', next: 'ready',       nextLabel: 'Marquer Prêt ✓' },
  ready:       { label: 'Prêt',            color: theme.teal, next: 'served',     nextLabel: 'Servi ✓' },
  served:      { label: 'Servi',           color: '#64748b', next: null,           nextLabel: null },
};

const MEAL_ICONS   = { breakfast: '🌅', lunch: '🌞', dinner: '🌙', custom: '⭐' };
const MEAL_LABELS  = { breakfast: 'Petit-déjeuner', lunch: 'Déjeuner', dinner: 'Dîner', custom: 'Personnalisé' };

// ── Kitchen Display ───────────────────────────────────────────────────────

function OrderCard({ order, onAdvance, activeShift }) {
  const meta = STATUS_META[order.status] || STATUS_META.pending;
  const time = new Date(order.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const items = order.items || [];

  const formulaItems = items.filter(it => it.formula_id);
  const extraItems   = items.filter(it => !it.formula_id);

  return (
    <div style={{
      background: theme.white, borderRadius: 12, padding: 16,
      border: `1.5px solid ${meta.color}44`,
      borderLeft: `4px solid ${meta.color}`,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, color: theme.dark }}>{order.table_label || 'Sans table'}</div>
          <div style={{ fontSize: 11, color: theme.dark, opacity: 0.45, marginTop: 1 }}>{time}</div>
        </div>
        <span style={{
          background: `${meta.color}18`, color: meta.color,
          fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 6, whiteSpace: 'nowrap',
        }}>
          {meta.label}
        </span>
      </div>

      {formulaItems.map((it, i) => {
        let choices = {};
        try { choices = JSON.parse(it.formula_choices || '{}'); } catch (_) {}
        const choiceEntries = Object.entries(choices);
        return (
          <div key={i} style={{ marginBottom: 8, padding: '8px 10px', background: '#f0fdf4', borderRadius: 8, border: '1px solid #bbf7d0' }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: '#15803d' }}>
              🍽️ ×{it.quantity} {it.item_name_fr}
            </div>
            {choiceEntries.map(([course, option]) => (
              <div key={course} style={{ fontSize: 11, color: theme.dark, paddingLeft: 12, marginTop: 2 }}>
                <span style={{ opacity: 0.55 }}>{course}:</span> <strong>{option}</strong>
              </div>
            ))}
          </div>
        );
      })}

      {extraItems.length > 0 && (
        <div style={{ fontSize: 13, color: theme.dark }}>
          {formulaItems.length > 0 && (
            <div style={{ fontSize: 11, fontWeight: 700, color: theme.dark, opacity: 0.45, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>
              ➕ Extras
            </div>
          )}
          {extraItems.map((it, i) => (
            <div key={i} style={{ padding: '3px 0', borderBottom: i < extraItems.length - 1 ? `1px solid ${theme.cream}` : 'none' }}>
              <span style={{ fontWeight: 600 }}>×{it.quantity}</span> {it.item_name_fr}
              {it.notes && <span style={{ color: theme.dark, opacity: 0.5, fontSize: 11 }}> — {it.notes}</span>}
            </div>
          ))}
        </div>
      )}

      {order.notes && (
        <div style={{ fontSize: 12, color: '#7c6e60', background: '#fef3c7', borderRadius: 6, padding: '6px 10px', marginTop: 8 }}>
          📝 {order.notes}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
        <div style={{ fontWeight: 800, color: theme.teal, fontSize: 14 }}>
          {order.total_amount?.toFixed(2)} MAD
        </div>
        {meta.next && (
          <button
            onClick={() => onAdvance(order.id, meta.next)}
            disabled={meta.next === 'served' && !activeShift}
            title={meta.next === 'served' && !activeShift ? 'Ouvrez un shift pour enregistrer la vente' : ''}
            style={{
              ...BTN_PRIMARY, padding: '7px 14px', fontSize: 12,
              background: meta.next === 'served' && !activeShift ? '#ccc' : theme.teal,
              cursor: meta.next === 'served' && !activeShift ? 'not-allowed' : 'pointer',
            }}
          >
            {meta.nextLabel}
          </button>
        )}
      </div>
    </div>
  );
}

function KitchenTab({ propertyId }) {
  const [orders, setOrders] = useState([]);
  const [activeShift, setActiveShift] = useState(null);
  const [newAlert, setNewAlert] = useState(false);

  const load = useCallback(async () => {
    const [ord, shifts] = await Promise.all([
      invoke('orders:getActive', { property_id: propertyId }),
      invoke('shifts:getActive', { property_id: propertyId }),
    ]);
    setOrders(ord || []);
    setActiveShift(shifts?.[0] || null);
  }, [propertyId]);

  useEffect(() => {
    load();
    const timer = setInterval(load, 8000);
    return () => clearInterval(timer);
  }, [load]);

  useEffect(() => {
    // on() is a no-op stub in web — returns unsub function
    const unsub = on('order:new', () => {
      setNewAlert(true);
      setTimeout(() => setNewAlert(false), 4000);
      load();
    });
    return unsub;
  }, [load]);

  async function handleAdvance(orderId, newStatus) {
    await invoke('orders:updateStatus', {
      id: orderId, status: newStatus,
      shift_id: newStatus === 'served' ? activeShift?.id : undefined,
    });
    load();
  }

  return (
    <div>
      {newAlert && (
        <div style={{
          position: 'fixed', top: 20, right: 20, zIndex: 999,
          background: theme.teal, color: 'white', borderRadius: 10,
          padding: '12px 20px', fontWeight: 700, fontSize: 14,
          boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
        }}>
          🔔 Nouvelle commande !
        </div>
      )}

      {!activeShift && (
        <div style={{ background: '#fef3c7', borderRadius: 10, padding: '10px 16px', marginBottom: 16, fontSize: 13, color: '#92400e' }}>
          ⚠ Aucun shift ouvert — les commandes servies ne créeront pas de transaction.
        </div>
      )}

      {orders.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: theme.dark, opacity: 0.35 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🍽</div>
          <div style={{ fontSize: 15, fontWeight: 600 }}>Aucune commande active</div>
          <div style={{ fontSize: 13, marginTop: 4 }}>Les commandes des clients apparaîtront ici</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
          {orders.map(order => (
            <OrderCard key={order.id} order={order} onAdvance={handleAdvance} activeShift={activeShift} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Formula Modal ─────────────────────────────────────────────────────────
// formulas:* return null in db.js (not implemented in web), so FormulaModal
// and FormulasSection are included as-is but will see empty lists.

function FormulaModal({ formulaId, propertyId, onSave, onClose }) {
  const isEdit = !!formulaId;
  const [form, setForm] = useState({ name_fr: '', name_ar: '', description_fr: '', price: '', meal_type: 'dinner' });
  const [courses, setCourses] = useState([]);
  const [saving, setSaving] = useState(false);
  const [newCourse, setNewCourse] = useState('');
  const [newOptions, setNewOptions] = useState({});

  useEffect(() => {
    if (!isEdit) return;
    invoke('formulas:getWithCourses', { id: formulaId }).then(f => {
      if (!f) return;
      setForm({ name_fr: f.name_fr, name_ar: f.name_ar || '', description_fr: f.description_fr || '', price: String(f.price), meal_type: f.meal_type });
      setCourses(f.courses || []);
    });
  }, [formulaId, isEdit]);

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function handleSave() {
    if (!form.name_fr.trim() || !form.price) return;
    setSaving(true);
    if (isEdit) {
      await invoke('formulas:update', { id: formulaId, ...form, price: parseFloat(form.price) });
    } else {
      const res = await invoke('formulas:create', { ...form, price: parseFloat(form.price), property_id: propertyId });
      const id = Array.isArray(res) ? res[0]?.id : res?.id;
      if (id) {
        for (let ci = 0; ci < courses.length; ci++) {
          const c = courses[ci];
          const cRes = await invoke('formulas:addCourse', {
            formula_id: id, name_fr: c.name_fr, name_ar: c.name_ar || null,
            must_choose: c.must_choose ? 1 : 0, sort_order: ci,
          });
          const cid = Array.isArray(cRes) ? cRes[0]?.id : cRes?.id;
          if (cid) {
            for (let oi = 0; oi < (c.options || []).length; oi++) {
              const o = c.options[oi];
              await invoke('formulas:addOption', { course_id: cid, name_fr: o.name_fr, sort_order: oi });
            }
          }
        }
      }
    }
    setSaving(false);
    onSave();
  }

  async function handleAddCourse() {
    if (!newCourse.trim()) return;
    const courseData = { name_fr: newCourse.trim(), must_choose: true, options: [] };
    if (isEdit) {
      const cRes = await invoke('formulas:addCourse', {
        formula_id: formulaId, name_fr: courseData.name_fr, must_choose: 1,
        sort_order: courses.length,
      });
      courseData.id = Array.isArray(cRes) ? cRes[0]?.id : cRes?.id;
    }
    setCourses(cs => [...cs, courseData]);
    setNewCourse('');
  }

  async function handleDeleteCourse(idx) {
    const c = courses[idx];
    if (c.id && isEdit) await invoke('formulas:deleteCourse', { id: c.id });
    setCourses(cs => cs.filter((_, i) => i !== idx));
  }

  async function handleAddOption(cIdx) {
    const txt = (newOptions[cIdx] || '').trim();
    if (!txt) return;
    const optData = { name_fr: txt };
    if (isEdit && courses[cIdx]?.id) {
      const oRes = await invoke('formulas:addOption', {
        course_id: courses[cIdx].id, name_fr: txt,
        sort_order: (courses[cIdx].options || []).length,
      });
      optData.id = Array.isArray(oRes) ? oRes[0]?.id : oRes?.id;
    }
    setCourses(cs => cs.map((c, i) => i === cIdx ? { ...c, options: [...(c.options || []), optData] } : c));
    setNewOptions(n => ({ ...n, [cIdx]: '' }));
  }

  async function handleDeleteOption(cIdx, oIdx) {
    const opt = courses[cIdx]?.options?.[oIdx];
    if (opt?.id && isEdit) await invoke('formulas:deleteOption', { id: opt.id });
    setCourses(cs => cs.map((c, i) => i === cIdx ? { ...c, options: c.options.filter((_, j) => j !== oIdx) } : c));
  }

  const MEAL_TYPES = [
    { key: 'breakfast', label: '🌅 Petit-déjeuner' },
    { key: 'lunch',     label: '🌞 Déjeuner' },
    { key: 'dinner',    label: '🌙 Dîner' },
    { key: 'custom',    label: '⭐ Personnalisé' },
  ];

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 500, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', overflowY: 'auto', padding: '20px 0' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: theme.white, borderRadius: 16, padding: 24, width: 560, maxWidth: '95vw', margin: 'auto' }}>
        <div style={{ fontSize: 17, fontWeight: 800, color: theme.dark, marginBottom: 20 }}>
          {isEdit ? 'Modifier la formule' : 'Nouvelle formule'}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div>
            <Label>Nom (FR) *</Label>
            <input value={form.name_fr} onChange={e => set('name_fr', e.target.value)} style={FIELD} placeholder="ex: Menu Dîner" autoFocus />
          </div>
          <div>
            <Label>Nom (العربية)</Label>
            <input value={form.name_ar} onChange={e => set('name_ar', e.target.value)} style={{ ...FIELD, direction: 'rtl' }} placeholder="قائمة العشاء" />
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <Label>Description</Label>
          <input value={form.description_fr} onChange={e => set('description_fr', e.target.value)} style={FIELD} placeholder="ex: Entrée + Plat principal + Dessert + Eau" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
          <div>
            <Label>Prix tout compris (MAD) *</Label>
            <input type="number" min="0" step="0.5" value={form.price} onChange={e => set('price', e.target.value)} style={FIELD} placeholder="120" />
          </div>
          <div>
            <Label>Type de repas</Label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, paddingTop: 4 }}>
              {MEAL_TYPES.map(t => (
                <button key={t.key} onClick={() => set('meal_type', t.key)} style={{
                  padding: '5px 10px', borderRadius: 7, fontSize: 12, fontFamily: theme.font, fontWeight: 600, cursor: 'pointer',
                  background: form.meal_type === t.key ? theme.teal : 'rgba(31,42,46,0.07)',
                  color: form.meal_type === t.key ? '#fff' : theme.dark, border: 'none',
                }}>{t.label}</button>
              ))}
            </div>
          </div>
        </div>

        <div style={{ borderTop: `1px solid rgba(31,42,46,0.1)`, paddingTop: 16, marginBottom: 16 }}>
          <Label>Services / Plats inclus</Label>

          {courses.map((course, cIdx) => (
            <div key={cIdx} style={{ background: theme.cream, borderRadius: 10, padding: 12, marginBottom: 10, border: '1px solid rgba(31,42,46,0.08)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ fontWeight: 700, fontSize: 13, flex: 1 }}>{course.name_fr}</span>
                <button onClick={() => setCourses(cs => cs.map((c, i) => i === cIdx ? { ...c, must_choose: !c.must_choose } : c))} style={{
                  fontSize: 11, padding: '3px 8px', borderRadius: 6, border: 'none', cursor: 'pointer', fontFamily: theme.font, fontWeight: 600,
                  background: course.must_choose ? '#dbeafe' : '#dcfce7', color: course.must_choose ? '#1e40af' : '#166534',
                }}>
                  {course.must_choose ? 'Au choix' : 'Tous inclus'}
                </button>
                <button onClick={() => handleDeleteCourse(cIdx)} style={{ ...BTN_DANGER, padding: '3px 8px', fontSize: 12 }}>🗑</button>
              </div>

              {(course.options || []).map((opt, oIdx) => (
                <div key={oIdx} style={{ display: 'flex', alignItems: 'center', gap: 6, paddingLeft: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 12, flex: 1 }}>• {opt.name_fr}</span>
                  <button onClick={() => handleDeleteOption(cIdx, oIdx)} style={{ ...BTN_DANGER, padding: '2px 6px', fontSize: 11 }}>✕</button>
                </div>
              ))}

              <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                <input
                  value={newOptions[cIdx] || ''}
                  onChange={e => setNewOptions(n => ({ ...n, [cIdx]: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && handleAddOption(cIdx)}
                  style={{ ...FIELD, fontSize: 12, padding: '6px 10px' }}
                  placeholder="+ Ajouter une option..."
                />
                <button onClick={() => handleAddOption(cIdx)} style={{ ...BTN_GHOST, padding: '6px 12px', fontSize: 12, flexShrink: 0 }}>+</button>
              </div>
            </div>
          ))}

          <div style={{ display: 'flex', gap: 8 }}>
            <input
              value={newCourse}
              onChange={e => setNewCourse(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddCourse()}
              style={{ ...FIELD, fontSize: 12 }}
              placeholder="Nom du service (ex: Entrée, Plat principal, Dessert...)"
            />
            <button onClick={handleAddCourse} style={{ ...BTN_GHOST, flexShrink: 0 }}>+ Service</button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={BTN_GHOST}>Annuler</button>
          <button onClick={handleSave} disabled={saving || !form.name_fr.trim() || !form.price} style={{ ...BTN_PRIMARY, opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Enregistrement...' : 'Enregistrer la formule'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Menu Management ───────────────────────────────────────────────────────

function ItemModal({ item, categoryId, onSave, onClose }) {
  const [form, setForm] = useState(item ? { ...item } : {
    name_fr: '', name_ar: '', name_en: '', description_fr: '',
    price: '', category_id: categoryId,
  });
  const [saving, setSaving] = useState(false);
  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function handleSave() {
    if (!form.name_fr.trim()) return;
    setSaving(true);
    await onSave({ ...form, price: parseFloat(form.price) || 0 });
    setSaving(false);
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 500,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: theme.white, borderRadius: 14, padding: 24, width: 420, maxWidth: '95vw' }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: theme.dark, marginBottom: 16 }}>
          {item ? 'Modifier le plat' : 'Ajouter un plat'}
        </div>

        <div style={{ marginBottom: 12 }}>
          <Label>Nom (Français) *</Label>
          <input value={form.name_fr} onChange={e => set('name_fr', e.target.value)} style={FIELD} placeholder="ex: Tajine Poulet" />
        </div>
        <div style={{ marginBottom: 12 }}>
          <Label>Nom (العربية)</Label>
          <input value={form.name_ar || ''} onChange={e => set('name_ar', e.target.value)} style={{ ...FIELD, direction: 'rtl' }} placeholder="مثال: طاجن دجاج" />
        </div>
        <div style={{ marginBottom: 12 }}>
          <Label>Description FR</Label>
          <input value={form.description_fr || ''} onChange={e => set('description_fr', e.target.value)} style={FIELD} placeholder="Ingrédients, accompagnement..." />
        </div>
        <div style={{ marginBottom: 16 }}>
          <Label>Prix (MAD) *</Label>
          <input type="number" min="0" step="0.5" value={form.price} onChange={e => set('price', e.target.value)} style={FIELD} placeholder="85" />
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={BTN_GHOST}>Annuler</button>
          <button onClick={handleSave} disabled={saving || !form.name_fr.trim()} style={{ ...BTN_PRIMARY, opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  );
}

function CategoryModal({ onSave, onClose }) {
  const [form, setForm] = useState({ name_fr: '', name_ar: '', name_en: '' });
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!form.name_fr.trim()) return;
    setSaving(true);
    await onSave(form);
    setSaving(false);
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 500,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: theme.white, borderRadius: 14, padding: 24, width: 380, maxWidth: '95vw' }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: theme.dark, marginBottom: 16 }}>Nouvelle catégorie</div>

        <div style={{ marginBottom: 12 }}>
          <Label>Nom (Français) *</Label>
          <input value={form.name_fr} onChange={e => setForm(f => ({ ...f, name_fr: e.target.value }))} style={FIELD} placeholder="ex: Tajines" autoFocus />
        </div>
        <div style={{ marginBottom: 12 }}>
          <Label>Nom (العربية)</Label>
          <input value={form.name_ar || ''} onChange={e => setForm(f => ({ ...f, name_ar: e.target.value }))} style={{ ...FIELD, direction: 'rtl' }} placeholder="مثال: طواجن" />
        </div>
        <div style={{ marginBottom: 16 }}>
          <Label>Nom (English)</Label>
          <input value={form.name_en || ''} onChange={e => setForm(f => ({ ...f, name_en: e.target.value }))} style={FIELD} placeholder="ex: Tagines" />
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={BTN_GHOST}>Annuler</button>
          <button onClick={handleSave} disabled={saving || !form.name_fr.trim()} style={{ ...BTN_PRIMARY, opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Enregistrement...' : 'Créer'}
          </button>
        </div>
      </div>
    </div>
  );
}

function FormulasSection({ propertyId }) {
  const [formulas, setFormulas] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const load = useCallback(async () => {
    const data = await invoke('formulas:getAll', { property_id: propertyId });
    setFormulas(data || []);
  }, [propertyId]);

  useEffect(() => { load(); }, [load]);

  async function handleToggle(f) {
    await invoke('formulas:toggle', { id: f.id, active: !f.active });
    load();
  }

  async function handleDelete(id) {
    await invoke('formulas:delete', { id });
    load();
  }

  const byType = {};
  for (const f of formulas) {
    (byType[f.meal_type] = byType[f.meal_type] || []).push(f);
  }
  const typeOrder = ['breakfast', 'lunch', 'dinner', 'custom'];

  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: theme.dark }}>FORMULES / MENUS</div>
          <div style={{ fontSize: 12, color: theme.dark, opacity: 0.45 }}>Prix fixe tout compris</div>
        </div>
        <button onClick={() => { setEditingId(null); setShowModal(true); }} style={BTN_PRIMARY}>
          + Nouvelle formule
        </button>
      </div>

      {formulas.length === 0 && (
        <div style={{ background: theme.cream, borderRadius: 10, padding: '20px', textAlign: 'center', border: `1.5px dashed rgba(31,42,46,0.15)` }}>
          <div style={{ fontSize: 24, marginBottom: 6 }}>🍽️</div>
          <div style={{ fontSize: 13, color: theme.dark, opacity: 0.5 }}>Aucune formule — créez un menu complet à prix fixe</div>
        </div>
      )}

      {typeOrder.filter(t => byType[t]?.length).map(type => (
        <div key={type} style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: theme.teal, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>
            {MEAL_ICONS[type]} {MEAL_LABELS[type]}
          </div>
          {byType[type].map(f => (
            <div key={f.id} style={{
              background: theme.white, borderRadius: 10, padding: '12px 14px', marginBottom: 8,
              border: `1px solid rgba(31,42,46,0.08)`,
              opacity: f.active ? 1 : 0.55,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ flex: 1 }}>
                  <span style={{ fontWeight: 700, fontSize: 14 }}>{f.name_fr}</span>
                  {f.name_ar && <span style={{ marginLeft: 8, fontSize: 12, color: theme.dark, opacity: 0.5, direction: 'rtl' }}>{f.name_ar}</span>}
                  {f.description_fr && <div style={{ fontSize: 11, color: theme.dark, opacity: 0.5, marginTop: 2 }}>{f.description_fr}</div>}
                </div>
                <span style={{ fontWeight: 800, color: theme.teal, fontSize: 14, whiteSpace: 'nowrap' }}>{f.price} MAD</span>
                <Toggle value={!!f.active} onChange={() => handleToggle(f)} />
                <button onClick={() => { setEditingId(f.id); setShowModal(true); }} style={{ ...BTN_GHOST, padding: '5px 10px', fontSize: 11 }}>✏</button>
                <button onClick={() => handleDelete(f.id)} style={{ ...BTN_DANGER, padding: '5px 8px', fontSize: 11 }}>🗑</button>
              </div>
            </div>
          ))}
        </div>
      ))}

      {showModal && (
        <FormulaModal
          formulaId={editingId}
          propertyId={propertyId}
          onSave={() => { setShowModal(false); setEditingId(null); load(); }}
          onClose={() => { setShowModal(false); setEditingId(null); }}
        />
      )}
    </div>
  );
}

function MenuTab({ propertyId }) {
  const [categories, setCategories] = useState([]);
  const [itemsByCategory, setItemsByCategory] = useState({});
  const [showCatModal, setShowCatModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [addingItemCatId, setAddingItemCatId] = useState(null);
  const [expanded, setExpanded] = useState({});

  const load = useCallback(async () => {
    const cats = await invoke('menu:getCategories', { property_id: propertyId });
    setCategories(cats || []);
    const map = {};
    for (const cat of (cats || [])) {
      map[cat.id] = await invoke('menu:getItems', { category_id: cat.id });
    }
    setItemsByCategory(map);
    if (cats?.length && Object.keys(expanded).length === 0) {
      const init = {};
      cats.forEach(c => { init[c.id] = true; });
      setExpanded(init);
    }
  }, [propertyId]);

  useEffect(() => { load(); }, [load]);

  async function handleCreateCategory(form) {
    await invoke('menu:createCategory', { ...form, property_id: propertyId });
    setShowCatModal(false);
    load();
  }

  async function handleSaveItem(form) {
    if (editingItem) {
      await invoke('menu:updateItem', { id: editingItem.id, ...form });
    } else {
      await invoke('menu:createItem', { ...form, category_id: addingItemCatId });
    }
    setEditingItem(null);
    setAddingItemCatId(null);
    load();
  }

  async function handleToggle(item) {
    await invoke('menu:toggleAvailable', { id: item.id, available: !item.available });
    load();
  }

  async function handleDeleteItem(id) {
    await invoke('menu:deleteItem', { id });
    load();
  }

  async function handleDeleteCategory(id) {
    await invoke('menu:deleteCategory', { id });
    load();
  }

  return (
    <div>
      <FormulasSection propertyId={propertyId} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <div style={{ flex: 1, height: 1, background: 'rgba(31,42,46,0.1)' }} />
        <div style={{ fontSize: 11, fontWeight: 700, color: theme.dark, opacity: 0.4, textTransform: 'uppercase', letterSpacing: 1 }}>
          CARTE — Suppléments &amp; extras
        </div>
        <div style={{ flex: 1, height: 1, background: 'rgba(31,42,46,0.1)' }} />
      </div>

      <div style={{ marginBottom: 16 }}>
        <button onClick={() => setShowCatModal(true)} style={BTN_PRIMARY}>+ Nouvelle catégorie</button>
      </div>

      {categories.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: theme.dark, opacity: 0.35 }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>📋</div>
          <div style={{ fontSize: 15, fontWeight: 600 }}>Aucune catégorie</div>
          <div style={{ fontSize: 13, marginTop: 4 }}>Créez des catégories (Tajines, Boissons...) pour les suppléments à la carte</div>
        </div>
      )}

      {categories.map(cat => {
        const items = itemsByCategory[cat.id] || [];
        const isOpen = expanded[cat.id];
        return (
          <div key={cat.id} style={{ background: theme.white, borderRadius: 12, border: '1px solid rgba(31,42,46,0.08)', marginBottom: 12, overflow: 'hidden' }}>
            <div
              style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', cursor: 'pointer', userSelect: 'none' }}
              onClick={() => setExpanded(ex => ({ ...ex, [cat.id]: !ex[cat.id] }))}
            >
              <span style={{ marginRight: 8, fontSize: 12, color: theme.dark, opacity: 0.4 }}>{isOpen ? '▼' : '▶'}</span>
              <div style={{ flex: 1 }}>
                <span style={{ fontWeight: 700, color: theme.dark, fontSize: 14 }}>{cat.name_fr}</span>
                {cat.name_ar && <span style={{ marginLeft: 8, color: theme.dark, opacity: 0.5, fontSize: 13, direction: 'rtl' }}>{cat.name_ar}</span>}
                <span style={{ marginLeft: 10, fontSize: 11, color: theme.dark, opacity: 0.4 }}>{items.length} plat{items.length !== 1 ? 's' : ''}</span>
              </div>
              <button onClick={e => { e.stopPropagation(); handleDeleteCategory(cat.id); }} style={{ ...BTN_DANGER, padding: '4px 8px', fontSize: 11 }}>
                Supprimer
              </button>
            </div>

            {isOpen && (
              <div style={{ borderTop: '1px solid rgba(31,42,46,0.06)', padding: '8px 16px 12px' }}>
                {items.map(item => (
                  <div key={item.id} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 0', borderBottom: '1px solid rgba(31,42,46,0.05)',
                  }}>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontWeight: 600, fontSize: 13 }}>{item.name_fr}</span>
                      {item.name_ar && <span style={{ marginLeft: 8, fontSize: 12, color: theme.dark, opacity: 0.5 }}>{item.name_ar}</span>}
                    </div>
                    <span style={{ fontWeight: 700, color: theme.teal, fontSize: 13, whiteSpace: 'nowrap' }}>{item.price} MAD</span>
                    <Toggle value={!!item.available} onChange={() => handleToggle(item)} />
                    <button onClick={() => setEditingItem(item)} style={{ ...BTN_GHOST, padding: '5px 10px', fontSize: 11 }}>✏</button>
                    <button onClick={() => handleDeleteItem(item.id)} style={{ ...BTN_DANGER, padding: '5px 8px', fontSize: 11 }}>✕</button>
                  </div>
                ))}

                <button
                  onClick={() => setAddingItemCatId(cat.id)}
                  style={{ marginTop: 8, background: 'none', border: `1.5px dashed rgba(31,42,46,0.2)`, borderRadius: 8, padding: '7px 16px', fontSize: 12, color: theme.dark, opacity: 0.55, cursor: 'pointer', fontFamily: theme.font, width: '100%' }}
                >
                  + Ajouter un plat
                </button>
              </div>
            )}
          </div>
        );
      })}

      {showCatModal && <CategoryModal onSave={handleCreateCategory} onClose={() => setShowCatModal(false)} />}
      {(editingItem || addingItemCatId) && (
        <ItemModal
          item={editingItem}
          categoryId={addingItemCatId}
          onSave={handleSaveItem}
          onClose={() => { setEditingItem(null); setAddingItemCatId(null); }}
        />
      )}
    </div>
  );
}

// ── QR / Server Tab — replaced with web placeholder ───────────────────────

function QRTab() {
  return (
    <div style={{ textAlign: 'center', padding: '60px 20px' }}>
      <div style={{ fontSize: 52, marginBottom: 16 }}>📱</div>
      <div style={{ fontSize: 18, fontWeight: 800, color: theme.dark, marginBottom: 8 }}>
        QR Codes — Application desktop uniquement
      </div>
      <div style={{ fontSize: 14, color: theme.dark, opacity: 0.5, maxWidth: 400, margin: '0 auto' }}>
        La génération de QR codes et le serveur de commandes en temps réel nécessitent
        l'application desktop RbitRate. Utilisez la version desktop pour configurer les tables
        et générer les QR codes pour vos clients.
      </div>
    </div>
  );
}

// ── Main Restaurant Screen ────────────────────────────────────────────────

export default function Restaurant() {
  const { selectedPropertyId, setPage } = useApp();
  const [property, setProperty] = useState(null);
  const [tab, setTab] = useState(0);

  useEffect(() => {
    if (!selectedPropertyId) return;
    invoke('properties:getAll', {}).then(props => {
      const p = (props || []).find(x => x.id === selectedPropertyId);
      setProperty(p || null);
    });
  }, [selectedPropertyId]);

  if (!selectedPropertyId) {
    return (
      <div style={{ textAlign: 'center', marginTop: 80, color: theme.dark, opacity: 0.35, fontFamily: theme.font }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🍽</div>
        <div style={{ fontSize: 15, fontWeight: 600 }}>Sélectionnez une propriété dans la barre du haut</div>
      </div>
    );
  }

  if (!property) return null;

  if (!property.restaurant_active) {
    return (
      <div style={{ textAlign: 'center', marginTop: 80, color: theme.dark, fontFamily: theme.font }}>
        <div style={{ fontSize: 52, marginBottom: 16 }}>🍽</div>
        <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>Restaurant non activé</div>
        <div style={{ fontSize: 14, color: theme.dark, opacity: 0.5, marginBottom: 24, maxWidth: 380, margin: '0 auto 24px' }}>
          Activez le restaurant dans les paramètres de la propriété pour accéder à cette section.
        </div>
        <button onClick={() => setPage('properties')} style={BTN_PRIMARY}>
          ⚙ Aller aux paramètres de la propriété
        </button>
      </div>
    );
  }

  const restaurantName = property.restaurant_name || `Restaurant — ${property.display_name}`;

  return (
    <div style={{ fontFamily: theme.font }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 900, color: theme.dark, margin: 0 }}>{restaurantName}</h1>
        <p style={{ fontSize: 13, color: theme.dark, opacity: 0.5, margin: '2px 0 0' }}>{property.display_name}</p>
      </div>

      <div style={{ display: 'flex', borderBottom: `1px solid rgba(31,42,46,0.1)`, marginBottom: 20 }}>
        <SubTab active={tab === 0} onClick={() => setTab(0)}>Cuisine 🍳</SubTab>
        <SubTab active={tab === 1} onClick={() => setTab(1)}>Menu 📋</SubTab>
        <SubTab active={tab === 2} onClick={() => setTab(2)}>QR Codes</SubTab>
      </div>

      {tab === 0 && <KitchenTab propertyId={selectedPropertyId} />}
      {tab === 1 && <MenuTab   propertyId={selectedPropertyId} />}
      {tab === 2 && <QRTab />}
    </div>
  );
}
