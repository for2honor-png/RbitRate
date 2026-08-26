function formatAmount(n) {
  if (n === null || n === undefined || n === '') return '';
  return Number(n).toLocaleString('fr-MA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function esc(s) {
  if (!s) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function generateInvoiceHTML({ invoice, items, property, client, agency, guide }) {
  const p = property || {};
  const inv = invoice || {};
  const rows = items || [];
  const isFacture = inv.type === 'facture';
  const docLabel = isFacture ? 'FACTURE' : 'NOTE PROFORMA';
  const numLabel = isFacture ? 'NUM FACTURE' : 'NUM PROFORMA';

  const itemRows = rows.map(item => `
    <tr>
      <td style="border:1px solid #000;padding:8px 6px;text-align:center">${esc(item.quantite) || ''}</td>
      <td style="border:1px solid #000;padding:8px">${esc(item.designation) || ''}</td>
      <td style="border:1px solid #000;padding:8px 6px;text-align:center">${esc(item.nb_nuitee) || ''}</td>
      <td style="border:1px solid #000;padding:8px;text-align:right">${formatAmount(item.prix_unitaire_ht)}</td>
      <td style="border:1px solid #000;padding:8px;text-align:right">${formatAmount(item.prix_total_ht)}</td>
    </tr>`).join('');

  const emptyRows = Array(Math.max(0, 5 - rows.length)).fill(0)
    .map(() => `<tr><td style="border:1px solid #000;padding:12px" colspan="5">&nbsp;</td></tr>`)
    .join('');

  const clientName = agency ? esc(agency.name) : (client ? esc(client.name) : '');
  const clientIce  = agency ? (agency.ice || '') : (client ? (client.ice || '') : '');

  const logoTag = p.logo_url
    ? `<img src="${esc(p.logo_url)}" style="width:65px;height:55px;object-fit:contain;flex-shrink:0">`
    : `<div style="width:65px;height:55px;flex-shrink:0"></div>`;

  const logoFooter = p.logo_url
    ? `<img src="${esc(p.logo_url)}" style="height:30px;object-fit:contain;display:block;margin:0 auto 6px">`
    : '';

  const footerLegal = [
    p.if_number  ? `IF : ${esc(p.if_number)}`   : '',
    p.patente    ? `Patente N° : ${esc(p.patente)}` : '',
    p.rc         ? `R.C N° : ${esc(p.rc)}`       : '',
    p.ice        ? `ICE : ${esc(p.ice)}`          : '',
    p.cnss       ? `CNSS : ${esc(p.cnss)}`        : '',
  ].filter(Boolean).join(' &nbsp;·&nbsp; ');

  const footerContact = [
    p.email   ? `E-mail : ${esc(p.email)}`   : '',
    p.website ? `Site : ${esc(p.website)}`   : '',
  ].filter(Boolean).join(' &nbsp;·&nbsp; ');

  const guideRow = guide
    ? `<tr>
        <td style="border:1px solid #000;padding:5px 10px;font-weight:700;background:#f5f5f5;text-align:left">
          ${esc(guide.role ? guide.role.toUpperCase() : 'GUIDE')}
        </td>
        <td style="border:1px solid #000;padding:5px 10px;text-align:right">
          ${esc(guide.name)}${guide.phone ? ` &nbsp;·&nbsp; ${esc(guide.phone)}` : ''}
        </td>
       </tr>`
    : '';

  return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="UTF-8">
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body {
  font-family: Arial, sans-serif;
  font-size: 11px;
  color: #000;
  background: #fff;
  padding: 15mm 18mm;
  width: 210mm;
  min-height: 297mm;
}
@media print {
  @page { size: A4; margin: 0; }
  body { padding: 12mm 16mm; }
}
</style>
</head><body>

<!-- HEADER -->
<div style="display:flex;align-items:center;margin-bottom:16px;
  padding-bottom:12px;border-bottom:2px solid #000;position:relative;min-height:60px">
  ${logoTag}
  <div style="position:absolute;left:0;right:0;text-align:center;
    font-size:26px;font-weight:700;letter-spacing:1px;pointer-events:none">
    ${esc((p.display_name || '').toUpperCase())}
  </div>
</div>

<!-- DOC TYPE TITLE -->
<div style="text-align:center;font-size:16px;font-weight:700;
  letter-spacing:2px;margin-bottom:14px;text-decoration:underline">
  ${docLabel}
</div>

<!-- META TABLE -->
<table style="border-collapse:collapse;width:100%;margin-bottom:16px;table-layout:fixed">
  <colgroup><col style="width:50%"><col style="width:50%"></colgroup>
  <tr>
    <td style="border:1px solid #000;padding:5px 10px;font-weight:700;background:#f5f5f5;text-align:left">DATE</td>
    <td style="border:1px solid #000;padding:5px 10px;text-align:right">${esc(inv.date) || ''}</td>
  </tr>
  <tr>
    <td style="border:1px solid #000;padding:5px 10px;font-weight:700;background:#f5f5f5;text-align:left">DATE DE RESERVATION</td>
    <td style="border:1px solid #000;padding:5px 10px;text-align:right">${esc(inv.reservation_date) || ''}</td>
  </tr>
  <tr>
    <td style="border:1px solid #000;padding:5px 10px;font-weight:700;background:#f5f5f5;text-align:left">CLIENT</td>
    <td style="border:1px solid #000;padding:5px 10px;text-align:right;font-weight:700">${clientName}</td>
  </tr>
  ${clientIce ? `<tr>
    <td style="border:1px solid #000;padding:5px 10px;font-weight:700;background:#f5f5f5;text-align:left">ICE</td>
    <td style="border:1px solid #000;padding:5px 10px;text-align:right">${esc(clientIce)}</td>
  </tr>` : ''}
  ${guideRow}
  <tr>
    <td style="border:1px solid #000;padding:5px 10px;font-weight:700;background:#f5f5f5;text-align:left">${numLabel}</td>
    <td style="border:1px solid #000;padding:5px 10px;text-align:right;font-weight:700">${esc(inv.number) || esc(inv.invoice_number) || ''}</td>
  </tr>
  ${inv.reference_groupe ? `<tr>
    <td style="border:1px solid #000;padding:5px 10px;font-weight:700;background:#f5f5f5;text-align:left">RÉFÉRENCE DE GROUPE</td>
    <td style="border:1px solid #000;padding:5px 10px;text-align:right">${esc(inv.reference_groupe)}</td>
  </tr>` : ''}
</table>

<!-- ITEMS TABLE -->
<table style="border-collapse:collapse;width:100%;margin-bottom:16px">
  <thead>
    <tr style="background:#000;color:#fff;font-weight:700;font-size:10px">
      <th style="border:1px solid #000;padding:6px;text-align:center;width:65px">QUANTITE</th>
      <th style="border:1px solid #000;padding:6px 8px;text-align:left">DESIGNATION</th>
      <th style="border:1px solid #000;padding:6px;text-align:center;width:65px">NB NUITEE</th>
      <th style="border:1px solid #000;padding:6px 8px;text-align:right;width:105px">PRIX UNITAIRE HT</th>
      <th style="border:1px solid #000;padding:6px 8px;text-align:right;width:105px">PRIX TOTAL HT</th>
    </tr>
  </thead>
  <tbody>
    ${itemRows}
    ${emptyRows}
  </tbody>
</table>

<!-- TOTALS + STAMP -->
<div style="display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:20px">
  ${isFacture
    ? `<div style="width:90px;height:90px;border:2px dashed #ccc;border-radius:50%;
         display:flex;align-items:center;justify-content:center;
         font-size:8px;color:#bbb;text-align:center;line-height:1.6">
         Cachet<br>propriété
       </div>`
    : '<div></div>'}

  <table style="border-collapse:collapse;min-width:250px">
    <tr>
      <td style="padding:5px 12px;font-weight:700;text-align:right">TOTAL HT</td>
      <td style="padding:5px 6px;text-align:center">:</td>
      <td style="border:1px solid #000;padding:5px 14px;text-align:right;min-width:95px">${formatAmount(inv.subtotal_ht ?? inv.subtotal)}</td>
    </tr>
    <tr>
      <td style="padding:5px 12px;font-weight:700;text-align:right">TVA ${inv.vat_rate ?? 10}%</td>
      <td style="padding:5px 6px;text-align:center">:</td>
      <td style="border:1px solid #000;padding:5px 14px;text-align:right">${formatAmount(inv.vat_amount)}</td>
    </tr>
    <tr>
      <td style="padding:5px 12px;font-weight:700;text-align:right;font-size:13px">TOTAL TTC</td>
      <td style="padding:5px 6px;text-align:center">:</td>
      <td style="border:2px solid #000;padding:6px 14px;text-align:right;font-weight:700;font-size:14px">${formatAmount(inv.total_ttc ?? inv.total)}</td>
    </tr>
  </table>
</div>

<!-- FOOTER -->
<div style="border-top:1.5px solid #000;padding-top:10px;text-align:center">
  ${logoFooter}
  <div style="font-size:8.5px;line-height:2;color:#333">
    ${esc(p.address || '')}${p.bp ? ` B.P : ${esc(p.bp)}` : ''} ${esc(p.city || '')}
    ${p.phone ? `&nbsp;·&nbsp; Tel : ${esc(p.phone)}` : ''}
    ${p.fax ? ` / Fax : ${esc(p.fax)}` : ''}<br>
    ${footerLegal}<br>
    ${p.bank_account ? `Compte (BP): ${esc(p.bank_account)}<br>` : ''}
    ${footerContact}
  </div>
</div>

</body></html>`;
}
