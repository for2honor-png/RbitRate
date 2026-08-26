'use strict';

function fmtDate(iso) {
  if (!iso) return '';
  const p = iso.split('-');
  return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : iso;
}

function esc(v) {
  if (v == null) return '';
  return String(v)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Header info line: label + underline value
function hline(label, value) {
  return `<div class="hline"><span class="hlbl">${label}</span><span class="hval">${esc(value)}</span></div>`;
}

// Field row: labels line + value underline below
function field(labelFr, subFr, value, labelAr) {
  return `
<div class="fl-row">
  <div class="fl-left"><div class="lm">${labelFr}</div><div class="ls">${subFr}</div></div>
  <div class="la">${labelAr}</div>
</div>
<div class="fv">${esc(value)}</div>`;
}

function generateFicheHTML(data) {
  const p = data.property    || {};
  const g = data.guest       || {};
  const r = data.reservation || {};

  const nameFr = esc(p.display_name_fr || p.display_name || 'Hôtel TAREK');
  const addr   = p.address || 'Rue Sidi Abdelhamid';
  const bp     = p.bp || p.city || 'B.P 22 - Chefchaouen';
  const phone  = p.phone || '+212 05 39 98 73 30';
  const fax    = p.fax   || '';
  // Only show Arabic elements when the property has Arabic data
  const showAr = !!(p.display_name_ar);

  const roomNum   = esc(r.room_number || '');
  const dobPlace  = [fmtDate(g.date_of_birth), esc(g.place_of_birth)].filter(Boolean).join(' — ');

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body {
  font-family: Arial, sans-serif;
  font-size: 11px;
  color: #000;
  background: #fff;
  padding: 15mm 20mm;
  width: 210mm;
  min-height: 297mm;
}

/* Header */
.hdr { display:grid; gap:6mm; margin-bottom:8mm; align-items:start; }
.hdr-l { font-size:10px; line-height:2.2; }
.hdr-c { text-align:center; }
.hdr-c .nar { font-family:Arial,sans-serif; font-size:18px; font-weight:700; direction:rtl; }
.hdr-c .nfr { font-size:15px; font-weight:700; margin-top:2px; }
.hdr-r { font-size:10px; line-height:2.2; text-align:right; direction:rtl; }
.hline { display:flex; align-items:flex-end; gap:4px; margin-bottom:1px; }
.hlbl  { white-space:nowrap; flex-shrink:0; }
.hval  { border-bottom:1px solid #000; flex:1; padding:0 2px; min-width:15px; }

/* Chambre row */
.chambre { display:flex; justify-content:space-between; align-items:flex-end; font-weight:700; font-size:12px; margin-bottom:8px; }
.cval { border-bottom:1px solid #000; display:inline-block; padding:0 4px; min-width:28px; }
.chambre-r { direction:rtl; display:flex; align-items:flex-end; gap:4px; }
.chambre-r .cv { border-bottom:1px solid #000; min-width:28px; padding:0 4px; text-align:center; }

/* Title row */
.title-row { display:flex; justify-content:space-between; border-bottom:1.5px solid #000; padding-bottom:8px; margin-bottom:14px; }
.title-fr { font-size:17px; font-weight:700; text-decoration:underline; }
.title-ar { font-size:17px; font-weight:700; text-decoration:underline; direction:rtl; }

/* Fields */
.fl-row { display:flex; justify-content:space-between; align-items:flex-start; }
.fl-left { }
.lm { font-size:11px; font-weight:700; }
.ls { font-size:8px; color:#666; }
.la { font-size:11px; font-weight:700; direction:rtl; text-align:right; flex-shrink:0; padding-left:4px; }
.fv { border-bottom:1px solid #000; margin:2px 0 10px; padding:2px 0 2px 2px; font-size:12px; min-height:18px; }

/* Dashed separator */
.sep { border-top:1px dashed #666; margin:4px 0 10px; }

/* Document details + signature */
.brow  { display:flex; gap:12px; align-items:flex-start; margin-bottom:10px; }
.bl    { flex:1; font-size:10px; }
.bline { display:flex; align-items:flex-end; margin-bottom:6px; gap:6px; }
.bline span { white-space:nowrap; }
.bv    { border-bottom:1px solid #000; flex:1; min-height:14px; padding:1px 3px; font-size:11px; }
.sigbox { width:140px; height:70px; flex-shrink:0; border:1.5px solid #000; display:flex; align-items:center; justify-content:center; }

/* HEURE */
.heure { border-top:1px solid #ccc; padding-top:6px; text-align:center; font-size:12px; }

@media print {
  @page { size: A4; margin: 0; }
  body { -webkit-print-color-adjust: exact; }
}
</style>
</head>
<body>

<!-- SECTION 1: HEADER -->
<div class="hdr" style="grid-template-columns:${showAr ? '1fr auto 1fr' : '1fr auto 1fr'};">
  <div class="hdr-l">
    ${hline('Rue :', addr)}
    ${hline('B.P :', bp)}
    ${hline('Tele :', phone)}
    ${hline('Fax :', fax)}
  </div>
  <div class="hdr-c">
    ${showAr ? `<div class="nar">${esc(p.display_name_ar)}</div>` : ''}
    <div class="nfr">${nameFr}</div>
  </div>
  ${showAr ? `
  <div class="hdr-r">
    ${hline('شارع :', addr)}
    ${hline('ص.ب :', bp)}
    ${hline('هاتف :', phone)}
    ${hline('فاكس :', fax)}
  </div>` : '<div></div>'}
</div>

<!-- SECTION 2: CHAMBRE ROW -->
<div class="chambre">
  <div>CHAMBRE N°&nbsp;<span class="cval">${roomNum}</span></div>
  <div class="chambre-r">
    <div class="cv">${roomNum}</div>
    <span>رقم البيت</span>
  </div>
</div>

<!-- SECTION 3: TITLE ROW -->
<div class="title-row">
  <div class="title-fr">BULLETIN D'ARRIVEE</div>
  <div class="title-ar">ورقة الوصول</div>
</div>

<!-- SECTION 4: 11 FIELDS -->
<div style="padding: 0 40px; box-sizing: border-box;">
${field('Nom', 'Name. Apellidos, Name', g.last_name, 'الاسم العائلي')}
${field('Prénoms', 'Christian Name, Nombre, Vorname', g.first_name, 'الاسم الشخصي')}
${field('Date et lieu de naissance', 'Date and place of birth, Fecha y lugar de nacimiento, Geburts datum and Ord', dobPlace, 'تاريخ ومكان الإزدياد')}
${field('Nationalité', 'Nationality. Nationalidad. Standiger Wohnort', g.nationality, 'الجنسية')}
${field('Qualité ou Profession', 'Cualification and Profession. Profesion. Beruf', g.profession, 'المهنة')}
${field('Domicile Habituel', 'Usual domicile - Domicilio - Herkommend von', g.permanent_address, 'السكن الحالي')}
${field('Lieu de provenance', 'Coming from, Procedencia, Herkommend von', r.coming_from, 'قادم من')}
${field('Lieu de destination', 'Going to, Destino. Reiseziel', r.going_to, 'ذاهب إلى')}
${field("Date d'entrée", 'Date of arrival, Fecha de entrada, Ankunfstag', fmtDate(r.check_in_date), 'تاريخ الدخول')}
${field('Date de Départ', 'Check out, Fecha de salida. Ankunfstag', fmtDate(r.check_out_date), 'تاريخ الذهاب')}
${field("N° d'entrée au Maroc", 'Number of arrival in Morocco, Numero de entrada en Marruecos', r.morocco_entry_number, 'رقم الدخول إلى المغرب')}
</div>

<!-- SECTION 5: DASHED SEPARATOR -->
<div class="sep"></div>

<!-- SECTION 6: NATURE DES PIÈCES — header only, no value on the underline -->
<div class="fl-row">
  <div class="fl-left">
    <div class="lm">Nature des pièces, d'identité produites</div>
    <div class="ls">Kind of identication Papers and number - Documentos de identidad presentados</div>
    <div class="ls">Art des Auswetses und Nunumer</div>
  </div>
  <div class="la">نوع الأوراق المنتوجة ورقمها</div>
</div>
<div class="fv"></div>

<!-- SECTION 7: DOCUMENT DETAILS + SIGNATURE -->
<div class="brow">
  <div class="bl">
    <div style="font-size:10px;margin-bottom:8px">
      - - - - - - -
      <span style="font-weight:700">${esc(g.document_type) || ''}</span>
      &nbsp;&nbsp;&nbsp; N°
      <span style="border-bottom:1px solid #000;display:inline-block;min-width:120px;vertical-align:bottom;font-size:11px">${esc(g.document_number) || ''}</span>
    </div>
    <div class="bline">
      <span>Délivré à</span>
      <div class="bv">${esc(g.document_issued_at)}</div>
      <span>le</span>
      <div class="bv" style="max-width:30mm">${esc(fmtDate(g.document_issued_date))}</div>
    </div>
    <div class="bline">
      <span>le</span>
      <div class="bv"></div>
    </div>
  </div>
  <div class="sigbox">
    <span style="font-size:10px;color:#666;font-style:italic;">Signature</span>
  </div>
</div>

<!-- SECTION 8: HEURE -->
<div class="heure"><strong>HEURE: </strong>${esc(r.arrival_time) || ''}</div>

</body>
</html>`;
}

function generateGroupFicheHTML(data) {
  const p         = data.property    || {};
  const grp       = data.group       || {};
  const rawGuests = data.guests      || [];

  // Sort: room first, then nationality within each room
  const guests = [...rawGuests].sort((a, b) => {
    const roomCmp = String(a.room_number || '').localeCompare(String(b.room_number || ''), 'fr', { numeric: true });
    if (roomCmp !== 0) return roomCmp;
    return String(a.nationality || '').localeCompare(String(b.nationality || ''), 'fr');
  });

  const nameFr = esc(p.display_name_fr || p.display_name || 'Hôtel TAREK');
  const addr   = p.address || 'Rue Sidi Abdelhamid';
  const bp     = p.bp || p.city || 'B.P 22 - Chefchaouen';
  const phone  = p.phone || '+212 05 39 98 73 30';
  const fax    = p.fax   || '';
  const showAr = !!(p.display_name_ar);

  // Build rows with dual rowspan: Chambre groups contain Nationalité sub-groups.
  // Two-level scan: outer loop over room runs, inner loop over nat runs within each room.
  let rows = '';
  let globalIdx = 1;
  let i = 0;

  while (i < guests.length) {
    // ── Room group: find all consecutive guests sharing the same room ──
    const roomVal = guests[i].room_number || '';
    let roomEnd = i + 1;
    while (roomEnd < guests.length && (guests[roomEnd].room_number || '') === roomVal) roomEnd++;
    const roomSpan = roomEnd - i;

    // ── Nationality sub-groups within this room ──
    let j = i;
    while (j < roomEnd) {
      const natVal = guests[j].nationality || '';
      let natEnd = j + 1;
      while (natEnd < roomEnd && (guests[natEnd].nationality || '') === natVal) natEnd++;
      const natSpan = natEnd - j;

      for (let k = j; k < natEnd; k++) {
        const g       = guests[k];
        const isFirstInRoom = k === i;
        const isFirstInNat  = k === j;
        const rowNum = globalIdx++;

        rows += `<tr>
          <td style="padding:5px 4px;border:1px solid #ccc;font-size:10px;text-align:center;width:28px">${rowNum}</td>
          <td style="padding:5px 4px;border:1px solid #ccc;font-size:10px"><strong>${esc((g.last_name || '').toUpperCase())}</strong></td>
          <td style="padding:5px 4px;border:1px solid #ccc;font-size:10px">${esc(g.first_name || '')}</td>
          <td style="padding:5px 4px;border:1px solid #ccc;font-size:10px;text-align:center">${fmtDate(g.date_of_birth)}</td>
          <td style="padding:5px 4px;border:1px solid #ccc;font-size:10px;text-align:center">${esc(`${g.document_type || ''} ${g.document_number || ''}`.trim())}</td>
          <td style="padding:5px 4px;border:1px solid #ccc;font-size:10px;text-align:center">${esc(g.morocco_entry_number || '')}</td>
          ${isFirstInRoom
            ? `<td rowspan="${roomSpan}" style="padding:5px 4px;border:1px solid #ccc;font-size:10px;text-align:center;vertical-align:middle;background:#f0f8f4;font-weight:700">${esc(String(roomVal))}</td>`
            : ''}
          ${isFirstInNat
            ? `<td rowspan="${natSpan}" style="padding:5px 4px;border:1px solid #ccc;font-size:10px;text-align:center;vertical-align:middle;background:#faf7f2;font-weight:500">${esc(natVal)}</td>`
            : ''}
        </tr>`;
      }

      j = natEnd;
    }

    i = roomEnd;
  }

  const agencyName   = esc(grp.agency_name || grp.name || '');
  const visitName    = esc(grp.visit_name || '');
  const guideName    = esc(grp.guide_name || grp.leader_name || '');
  const guideRole    = esc(grp.guide_role || grp.leader_role || '');
  const guidePhone   = esc(grp.guide_phone || grp.leader_phone || '');
  const groupFrom    = esc(grp.coming_from || '');
  const groupTo      = esc(grp.going_to || '');
  const groupCheckIn = fmtDate(grp.check_in_date || '');
  const groupCheckOut= fmtDate(grp.check_out_date || '');

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family:Arial,sans-serif; font-size:11px; color:#000; background:#fff; padding:12mm 15mm; width:210mm; min-height:297mm; }
.hdr { display:grid; gap:5mm; margin-bottom:5mm; align-items:start; }
.hdr-l,.hdr-r { font-size:10px; line-height:2.2; }
.hdr-c { text-align:center; }
.hdr-c .nar { font-size:18px; font-weight:700; direction:rtl; }
.hdr-c .nfr { font-size:15px; font-weight:700; margin-top:2px; }
.hdr-r { text-align:right; direction:rtl; }
.hline { display:flex; align-items:flex-end; gap:4px; margin-bottom:1px; }
.hlbl { white-space:nowrap; flex-shrink:0; }
.hval { border-bottom:1px solid #000; flex:1; padding:0 2px; min-width:15px; }
.group-box { border:1.5px solid #1f2a2e; border-radius:4px; padding:8px 12px; margin-bottom:10px; display:grid; grid-template-columns:1fr 1fr; gap:4px 16px; font-size:10px; }
.group-box .lbl { font-weight:700; color:#555; }
@media print { @page { size:A4; margin:0; } body { -webkit-print-color-adjust:exact; } }
</style>
</head>
<body>

<div class="hdr" style="grid-template-columns:${showAr ? '1fr auto 1fr' : '1fr auto 1fr'};">
  <div class="hdr-l">
    ${hline('Rue :', addr)}
    ${hline('B.P :', bp)}
    ${hline('Tele :', phone)}
    ${hline('Fax :', fax)}
  </div>
  <div class="hdr-c">
    ${showAr ? `<div class="nar">${esc(p.display_name_ar)}</div>` : ''}
    <div class="nfr">${nameFr}</div>
  </div>
  ${showAr ? `<div class="hdr-r">
    ${hline('شارع :', addr)}
    ${hline('ص.ب :', bp)}
    ${hline('هاتف :', phone)}
    ${hline('فاكس :', fax)}
  </div>` : '<div></div>'}
</div>

<div style="text-align:center;margin:6px 0 10px;border-bottom:1.5px solid #000;padding-bottom:6px">
  <div style="font-size:16px;font-weight:700;text-decoration:underline">LISTE DES CLIENTS / قائمة النزلاء</div>
</div>

${(agencyName || guideName || groupCheckIn) ? `
<div class="group-box">
  ${agencyName ? `<div style="grid-column:span 2"><span class="lbl">Agence / Groupe : </span>${agencyName}${visitName ? ` &nbsp;·&nbsp; <em>${visitName}</em>` : ''}</div>` : '<div style="grid-column:span 2"></div>'}
  ${guideName ? `<div><span class="lbl">${guideRole ? guideRole.charAt(0).toUpperCase() + guideRole.slice(1) : 'Guide'} : </span>${guideName}${guidePhone ? ' &nbsp;·&nbsp; ' + guidePhone : ''}</div>` : '<div></div>'}
  <div><span class="lbl">Arrivée : </span>${groupCheckIn}${groupCheckOut ? ` &nbsp;→&nbsp; Départ : ${groupCheckOut}` : ''}</div>
  <div>${groupFrom ? `<span class="lbl">De : </span>${groupFrom}` : ''}${groupFrom && groupTo ? ' &nbsp;→&nbsp; ' : ''}${groupTo ? `<span class="lbl">À : </span>${groupTo}` : ''}</div>
</div>` : ''}

<table style="width:100%;border-collapse:collapse">
  <thead>
    <tr style="background:#1f2a2e;color:#fff;font-weight:700;font-size:10px">
      <th style="padding:6px 4px;border:1px solid #333;width:26px">N°</th>
      <th style="padding:6px 4px;border:1px solid #333">Nom / الاسم العائلي</th>
      <th style="padding:6px 4px;border:1px solid #333">Prénom / الاسم الشخصي</th>
      <th style="padding:6px 4px;border:1px solid #333">Date naiss.</th>
      <th style="padding:6px 4px;border:1px solid #333">N° pièce identité</th>
      <th style="padding:6px 4px;border:1px solid #333">N° entrée Maroc</th>
      <th style="padding:6px 4px;border:1px solid #333;width:48px">Chambre</th>
      <th style="padding:6px 4px;border:1px solid #333">Nationalité / الجنسية</th>
    </tr>
  </thead>
  <tbody>${rows}</tbody>
</table>

<div style="margin-top:12px;display:flex;justify-content:space-between;font-size:11px">
  <span>Total : <strong>${guests.length}</strong> personne${guests.length > 1 ? 's' : ''}</span>
  <span>Signature du réceptionniste : _____________________________</span>
</div>

</body>
</html>`;
}

module.exports = { generateFicheHTML, generateGroupFicheHTML };
