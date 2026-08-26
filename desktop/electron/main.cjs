'use strict';
require('dotenv').config({ path: require('node:path').join(__dirname, '../.env') });
const { app, BrowserWindow, ipcMain, dialog, Notification } = require('electron');
const { join } = require('node:path');
const path = require('node:path');
const os = require('node:os');
const fs = require('node:fs');
const http = require('node:http');
const { v4: uuidv4 } = require('uuid');
const QRCode = require('qrcode');
const db = require('./db.cjs');
const { generateFicheHTML, generateGroupFicheHTML } = require('./fiche-template.cjs');
const { generateInvoiceHTML } = require('./invoice-template.cjs');
const { syncOTA, fetchICalEvents } = require('./ical-sync.cjs');
const { createClient } = require('@supabase/supabase-js');
const WebSocket = require('ws');
const { SyncEngine } = require('./sync-engine.cjs');
const { DesktopAdapter } = require('./sync-adapter.cjs');

const crypto = require('node:crypto');

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

let supabase = null;
let syncEngine = null;
let supabaseSyncInterval = null;
let latestSyncStatus = { state: 'idle', at: null, error: null };

function initSupabase() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.warn('[sync] Supabase credentials missing — sync disabled.',
      'SUPABASE_URL:', SUPABASE_URL ? 'SET' : 'MISSING',
      'SUPABASE_SERVICE_KEY:', SUPABASE_SERVICE_KEY ? 'SET' : 'MISSING'
    );
    return;
  }
  console.log('[sync] Initializing Supabase client:', SUPABASE_URL);
  supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false },
    realtime: { transport: WebSocket },
  });
  const adapter = new DesktopAdapter(db);
  syncEngine = new SyncEngine(adapter, supabase);
  console.log('[sync] SyncEngine ready.');
}

async function runSupabaseSync() {
  if (!syncEngine) {
    console.warn('[sync] runSupabaseSync called but syncEngine is null — skipping.');
    return;
  }

  const { net } = require('electron');
  if (!net.isOnline()) {
    console.warn('[sync] Skipping sync — device is offline.');
    latestSyncStatus = { state: 'error', at: new Date().toISOString(), error: 'Hors ligne' };
    if (mainWindow) mainWindow.webContents.send('sync:status', latestSyncStatus);
    return;
  }

  console.log('[sync] Starting Supabase sync...');
  latestSyncStatus = { state: 'syncing', at: null, error: null };
  if (mainWindow) mainWindow.webContents.send('sync:status', latestSyncStatus);
  try {
    const result = await syncEngine.sync();
    if (result.errors.length) {
      console.error('[sync] Sync completed with errors:');
      result.errors.forEach((err, i) => console.error(`  [${i + 1}]`, err));
    } else {
      console.log(`[sync] OK — pushed: ${result.pushed}, pulled: ${result.pulled}`);
    }
    latestSyncStatus = {
      state: result.errors.length ? 'error' : 'ok',
      at: result.at,
      error: result.errors.length ? result.errors.join(' | ') : null,
      pushed: result.pushed,
      pulled: result.pulled,
    };
  } catch (e) {
    console.error('[sync] Sync threw unexpectedly:', e.message, e.stack);
    latestSyncStatus = { state: 'error', at: new Date().toISOString(), error: e.message };
  }
  if (mainWindow) mainWindow.webContents.send('sync:status', latestSyncStatus);
}

const ORDER_SERVER_PORT = 3721;
const MOBILE_API_PORT   = 3722;
let orderServer  = null;
let mobileServer = null;

let icalModule = null;
function getIcalGenerator() {
  if (!icalModule) icalModule = require('ical-generator');
  return icalModule.default || icalModule;
}

let mainWindow = null;
let syncInterval = null;

const isDev = !app.isPackaged;

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      preload: join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    titleBarStyle: 'default',
    title: 'RbitRate PMS',
    backgroundColor: '#faf7f2',
  });

  if (isDev) {
    win.loadURL('http://localhost:5173');
  } else {
    win.loadFile(join(__dirname, '../dist/index.html'));
  }
  return win;
}

app.whenReady().then(() => {
  const dbPath = join(app.getPath('userData'), 'rbitrate.db');
  db.initDb(dbPath);
  initSupabase();

  // ── Supabase sync IPC ───────────────────────────────────────────────────
  ipcMain.handle('sync:now', async () => {
    await runSupabaseSync();
    return latestSyncStatus;
  });
  ipcMain.handle('sync:status', () => latestSyncStatus);
  ipcMain.handle('sync:reset', async () => {
    // Reset all synced_at → forces complete re-push on next sync
    const result = db.syncResetAll();
    await runSupabaseSync();
    return { ...result, ...latestSyncStatus };
  });

  // ── Staff ──────────────────────────────────────────────────────────────
  ipcMain.handle('staff:login',       (_, args) => db.staffLogin(args));
  ipcMain.handle('staff:getAll',      ()        => db.staffGetAll());
  ipcMain.handle('staff:getFull',     ()        => db.staffGetAllFull());
  ipcMain.handle('staff:create',      (_, args) => db.staffCreate(args));
  ipcMain.handle('staff:update',      (_, args) => db.staffUpdate(args));
  ipcMain.handle('staff:deactivate',  (_, args) => db.staffDeactivate(args));

  // ── Properties ─────────────────────────────────────────────────────────
  ipcMain.handle('properties:getAll',    ()        => db.propertiesGetAll());
  ipcMain.handle('properties:create',    (_, args) => db.propertiesCreate(args));
  ipcMain.handle('properties:update',    (_, args) => db.propertiesUpdate(args));
  ipcMain.handle('properties:delete',    (_, args) => db.propertiesDelete(args));
  ipcMain.handle('properties:setLogo',   (_, args) => db.propertiesSetLogo(args));

  // ── Rooms ───────────────────────────────────────────────────────────────
  ipcMain.handle('rooms:getAll',          (_, args) => db.roomsGetAll(args));
  ipcMain.handle('rooms:create',          (_, args) => db.roomsCreate(args));
  ipcMain.handle('rooms:update',          (_, args) => db.roomsUpdate(args));
  ipcMain.handle('rooms:delete',          (_, args) => db.roomsDelete(args));
  ipcMain.handle('rooms:updateStatus',    (_, args) => db.roomsUpdateStatus(args));
  ipcMain.handle('rooms:getWithCapacity', (_, args) => db.roomsGetWithCapacity(args));

  // ── Guests ──────────────────────────────────────────────────────────────
  ipcMain.handle('guests:search',        (_, args) => db.guestsSearch(args));
  ipcMain.handle('guests:getAll',        (_, args) => db.guestsGetAll(args));
  ipcMain.handle('guests:getById',       (_, args) => db.guestsGetById(args));
  ipcMain.handle('guests:create',        (_, args) => db.guestsCreate(args));
  ipcMain.handle('guests:update',        (_, args) => db.guestsUpdate(args));
  ipcMain.handle('guests:setTag',        (_, args) => db.guestsSetTag(args));
  ipcMain.handle('guests:delete',        (_, args) => db.guestsDelete(args));
  ipcMain.handle('guests:getStayHistory',(_, args) => db.guestsGetStayHistory(args));

  // ── Reservations ────────────────────────────────────────────────────────
  ipcMain.handle('reservations:create',       (_, args) => db.reservationsCreate(args));
  ipcMain.handle('reservations:getActive',    (_, args) => db.reservationsGetActive(args));
  ipcMain.handle('reservations:getByRoom',    (_, args) => db.reservationsGetByRoom(args));
  ipcMain.handle('reservations:checkout',     (_, args) => db.reservationsCheckout(args));
  ipcMain.handle('reservations:getAll',       (_, args) => db.reservationsGetAll(args));
  ipcMain.handle('reservations:getTodayStats',(_, args) => db.reservationsGetTodayStats(args));

  // ── System ──────────────────────────────────────────────────────────────
  ipcMain.handle('dialog:pickImage', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'svg', 'webp'] }],
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0];
  });

  // ── Shifts ──────────────────────────────────────────────────────────────
  ipcMain.handle('shifts:open',       (_, args) => db.shiftsOpen(args));
  ipcMain.handle('shifts:close',      (_, args) => db.shiftsClose(args));
  ipcMain.handle('shifts:getActive',  (_, args) => db.shiftsGetActive(args));
  ipcMain.handle('shifts:getAll',     (_, args) => db.shiftsGetAll(args));
  ipcMain.handle('shifts:getById',    (_, args) => db.shiftsGetById(args));
  ipcMain.handle('shifts:checkOpen',  (_, args) => db.shiftsCheckOpen(args));

  // ── Transactions ─────────────────────────────────────────────────────────
  ipcMain.handle('transactions:create',     (_, args) => db.transactionsCreate(args));
  ipcMain.handle('transactions:getByShift', (_, args) => db.transactionsGetByShift(args));

  // ── Finance ──────────────────────────────────────────────────────────────
  ipcMain.handle('finance:getSummary',           (_, args) => db.financeGetSummary(args));
  ipcMain.handle('finance:getRecentTransactions',(_, args) => db.financeGetRecentTransactions(args));
  ipcMain.handle('finance:getTodayTotals',       (_, args) => db.financeGetTodayTotals(args));

  ipcMain.handle('finance:exportCSV', async (_, { property_id, period }) => {
    const txns = db.financeGetRecentTransactions({ property_id, limit: 10000 });
    if (!txns.length) return { ok: false, error: 'Aucune transaction à exporter.' };
    const headers = ['Date', 'Type', 'Catégorie', 'Mode', 'Montant', 'Description', 'Enregistré par', 'Shift'];
    const rows = txns.map(t => [
      t.created_at, t.type === 'income' ? 'Recette' : 'Dépense', t.category,
      t.payment_method || '', t.amount, t.description || '', t.full_name || '', t.shift_id,
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const { canceled, filePath } = await dialog.showSaveDialog({
      title: 'Exporter les transactions',
      defaultPath: `transactions-${period || 'all'}-${new Date().toISOString().split('T')[0]}.csv`,
      filters: [{ name: 'CSV', extensions: ['csv'] }],
    });
    if (canceled || !filePath) return { ok: false, error: 'Annulé.' };
    fs.writeFileSync(filePath, '﻿' + csv, 'utf8'); // BOM for Excel
    return { ok: true, path: filePath };
  });

  // ── Fiche / Bulletin d'Arrivée ───────────────────────────────────────────
  ipcMain.handle('fiche:print', async (_, { reservationId }) => {
    try {
      const row = db.prepare(`
        SELECT r.*,
          g.last_name, g.first_name, g.date_of_birth, g.place_of_birth,
          g.nationality, g.profession, g.permanent_address,
          g.document_type, g.document_number, g.document_issued_at, g.document_issued_date,
          rm.room_number,
          p.display_name, p.display_name_ar, p.address, p.city,
          p.phone, p.fax
        FROM reservations r
        LEFT JOIN guests g ON r.guest_id = g.id
        LEFT JOIN rooms rm ON r.room_id = rm.id
        LEFT JOIN properties p ON r.property_id = p.id
        WHERE r.id = ?
      `).get(reservationId);

      if (!row) return { ok: false, error: 'Réservation introuvable' };

      const html = generateFicheHTML({
        property: {
          display_name_fr: row.display_name || '',
          display_name_ar: row.display_name_ar || null,
          address: row.address || '',
          bp: row.city || '',
          phone: row.phone || '',
          fax: row.fax || '',
        },
        guest: {
          last_name: row.last_name ? row.last_name.toUpperCase() : '',
          first_name: row.first_name || '',
          date_of_birth: row.date_of_birth || '',
          place_of_birth: row.place_of_birth || '',
          nationality: row.nationality || '',
          profession: row.profession || '',
          permanent_address: row.permanent_address || '',
          document_type: row.document_type || '',
          document_number: row.document_number || '',
          document_issued_at: row.document_issued_at || '',
          document_issued_date: row.document_issued_date || '',
        },
        reservation: {
          room_number: row.room_number || '',
          arrival_time: row.arrival_time || '',
          check_in_date: row.check_in_date || '',
          check_out_date: row.check_out_date || '',
          coming_from: row.coming_from || '',
          going_to: row.going_to || '',
          morocco_entry_number: row.morocco_entry_number || '',
        },
      });

      const printWin = new BrowserWindow({
        width: 794, height: 1123, show: false,
        webPreferences: { nodeIntegration: false, contextIsolation: true },
      });

      const encoded = encodeURIComponent(html);
      await printWin.loadURL(`data:text/html;charset=utf-8,${encoded}`);
      await new Promise(resolve => setTimeout(resolve, 1500));

      return await new Promise((resolve) => {
        printWin.webContents.print(
          { silent: false, printBackground: true, pageSize: 'A4', margins: { marginType: 'none' } },
          (success, errorType) => {
            printWin.close();
            if (success) {
              resolve({ ok: true });
            } else {
              console.error('[fiche:print] Print failed:', errorType);
              resolve({ ok: false, error: errorType || 'Erreur impression' });
            }
          }
        );
      });
    } catch (err) {
      console.error('[fiche:print] error:', err);
      return { ok: false, error: err.message };
    }
  });

  ipcMain.handle('fiche:savePDF', async (_, { reservationId }) => {
    try {
      const row = db.prepare(`
        SELECT r.*,
          g.last_name, g.first_name, g.date_of_birth, g.place_of_birth,
          g.nationality, g.profession, g.permanent_address,
          g.document_type, g.document_number, g.document_issued_at, g.document_issued_date,
          rm.room_number,
          p.display_name, p.display_name_ar, p.address, p.city,
          p.phone, p.fax
        FROM reservations r
        LEFT JOIN guests g ON r.guest_id = g.id
        LEFT JOIN rooms rm ON r.room_id = rm.id
        LEFT JOIN properties p ON r.property_id = p.id
        WHERE r.id = ?
      `).get(reservationId);

      if (!row) return { ok: false, error: 'Réservation introuvable' };

      const html = generateFicheHTML({
        property: {
          display_name_fr: row.display_name || '',
          display_name_ar: row.display_name_ar || null,
          address: row.address || '',
          bp: row.city || '',
          phone: row.phone || '',
          fax: row.fax || '',
        },
        guest: {
          last_name: row.last_name ? row.last_name.toUpperCase() : '',
          first_name: row.first_name || '',
          date_of_birth: row.date_of_birth || '',
          place_of_birth: row.place_of_birth || '',
          nationality: row.nationality || '',
          profession: row.profession || '',
          permanent_address: row.permanent_address || '',
          document_type: row.document_type || '',
          document_number: row.document_number || '',
          document_issued_at: row.document_issued_at || '',
          document_issued_date: row.document_issued_date || '',
        },
        reservation: {
          room_number: row.room_number || '',
          arrival_time: row.arrival_time || '',
          check_in_date: row.check_in_date || '',
          check_out_date: row.check_out_date || '',
          coming_from: row.coming_from || '',
          going_to: row.going_to || '',
          morocco_entry_number: row.morocco_entry_number || '',
        },
      });

      const { filePath } = await dialog.showSaveDialog({
        defaultPath: `fiche-${reservationId.slice(0, 8)}.pdf`,
        filters: [{ name: 'PDF', extensions: ['pdf'] }],
      });
      if (!filePath) return { ok: false, error: 'Annulé' };

      const pdfWin = new BrowserWindow({
        width: 794, height: 1123, show: false,
        webPreferences: { nodeIntegration: false, contextIsolation: true },
      });

      const encoded = encodeURIComponent(html);
      await pdfWin.loadURL(`data:text/html;charset=utf-8,${encoded}`);
      await new Promise(resolve => setTimeout(resolve, 1500));

      const pdfBuffer = await pdfWin.webContents.printToPDF({
        pageSize: 'A4',
        printBackground: true,
        margins: { marginType: 'none' },
      });
      pdfWin.close();

      fs.writeFileSync(filePath, pdfBuffer);
      return { ok: true, path: filePath };
    } catch (err) {
      console.error('[fiche:savePDF] error:', err);
      return { ok: false, error: err.message };
    }
  });

  // ── Reservation Guests ────────────────────────────────────────────────────
  ipcMain.handle('reservation_guests:getAll',    (_, args) => db.reservationGuestsGetAll(args));
  ipcMain.handle('reservation_guests:getCounts', (_, args) => db.reservationGuestsGetCounts(args));
  ipcMain.handle('reservation_guests:remove',    (_, args) => db.reservationGuestsRemove(args));

  ipcMain.handle('reservation_guests:add', async (_, { reservation_id, guest }) => {
    try {
      const reservation = db.prepare('SELECT * FROM reservations WHERE id = ?').get(reservation_id);
      if (!reservation) return { ok: false, error: 'Réservation introuvable' };
      const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(reservation.room_id);
      if (!room) return { ok: false, error: 'Chambre introuvable' };

      const { count } = db.prepare(
        'SELECT COUNT(*) as count FROM reservation_guests WHERE reservation_id = ?'
      ).get(reservation_id);
      if (count >= room.capacity) {
        return { ok: false, error: `Chambre complète (capacité: ${room.capacity} personne${room.capacity > 1 ? 's' : ''})` };
      }

      let guestId = guest.id;
      if (!guestId) {
        const result = db.guestsCreate({
          last_name: guest.last_name, first_name: guest.first_name,
          date_of_birth: guest.date_of_birth, place_of_birth: guest.place_of_birth,
          nationality: guest.nationality, profession: guest.profession,
          permanent_address: guest.permanent_address,
          document_type: guest.document_type, document_number: guest.document_number,
          document_issued_at: guest.document_issued_at, document_issued_date: guest.document_issued_date,
          phone: guest.phone, email: guest.email,
        });
        guestId = result.id;
      }

      db.reservationGuestsAdd({
        reservation_id, guest_id: guestId,
        coming_from: guest.coming_from, going_to: guest.going_to,
        morocco_entry_number: guest.morocco_entry_number,
      });
      return { ok: true, guest_id: guestId };
    } catch (err) {
      console.error('[reservation_guests:add] error:', err);
      return { ok: false, error: err.message };
    }
  });

  ipcMain.handle('fiche:printForGuest', async (_, { reservationId, guestId }) => {
    try {
      const row = db.prepare(`
        SELECT r.*,
          g.last_name, g.first_name, g.date_of_birth, g.place_of_birth,
          g.nationality, g.profession, g.permanent_address,
          g.document_type, g.document_number, g.document_issued_at, g.document_issued_date,
          rg.coming_from as rg_coming_from, rg.going_to as rg_going_to,
          rg.morocco_entry_number as rg_morocco_entry_number,
          rm.room_number,
          p.display_name, p.display_name_ar, p.address, p.city, p.phone, p.fax
        FROM reservations r
        JOIN guests g ON g.id = ?
        LEFT JOIN reservation_guests rg ON rg.reservation_id = r.id AND rg.guest_id = ?
        LEFT JOIN rooms rm ON r.room_id = rm.id
        LEFT JOIN properties p ON r.property_id = p.id
        WHERE r.id = ?
      `).get(guestId, guestId, reservationId);

      if (!row) return { ok: false, error: 'Données introuvables' };

      const html = generateFicheHTML({
        property: {
          display_name_fr: row.display_name || '',
          display_name_ar: row.display_name_ar || null,
          address: row.address || '',
          bp: row.city || '',
          phone: row.phone || '',
          fax: row.fax || '',
        },
        guest: {
          last_name: row.last_name ? row.last_name.toUpperCase() : '',
          first_name: row.first_name || '',
          date_of_birth: row.date_of_birth || '',
          place_of_birth: row.place_of_birth || '',
          nationality: row.nationality || '',
          profession: row.profession || '',
          permanent_address: row.permanent_address || '',
          document_type: row.document_type || '',
          document_number: row.document_number || '',
          document_issued_at: row.document_issued_at || '',
          document_issued_date: row.document_issued_date || '',
        },
        reservation: {
          room_number: row.room_number || '',
          arrival_time: row.arrival_time || '',
          check_in_date: row.check_in_date || '',
          check_out_date: row.check_out_date || '',
          coming_from: row.rg_coming_from || row.coming_from || '',
          going_to: row.rg_going_to || row.going_to || '',
          morocco_entry_number: row.rg_morocco_entry_number || row.morocco_entry_number || '',
        },
      });

      const printWin = new BrowserWindow({
        width: 794, height: 1123, show: false,
        webPreferences: { nodeIntegration: false, contextIsolation: true },
      });
      const encoded = encodeURIComponent(html);
      await printWin.loadURL(`data:text/html;charset=utf-8,${encoded}`);
      await new Promise(resolve => setTimeout(resolve, 1500));

      return await new Promise((resolve) => {
        printWin.webContents.print(
          { silent: false, printBackground: true, pageSize: 'A4', margins: { marginType: 'none' } },
          (success, errorType) => {
            printWin.close();
            if (success) { resolve({ ok: true }); }
            else { console.error('[fiche:printForGuest] Print failed:', errorType); resolve({ ok: false, error: errorType || 'Erreur impression' }); }
          }
        );
      });
    } catch (err) {
      console.error('[fiche:printForGuest] error:', err);
      return { ok: false, error: err.message };
    }
  });

  // ── Groups ──────────────────────────────────────────────────────────────────
  ipcMain.handle('groups:create', (_, args) => db.groupsCreate(args));
  ipcMain.handle('groups:list',   (_, args) => db.groupsList(args));
  ipcMain.handle('groups:get',    (_, args) => db.groupsGet(args));

  // ── Tour Agencies ──────────────────────────────────────────────────────────
  ipcMain.handle('agencies:getAll',    ()        => db.agenciesGetAll());
  ipcMain.handle('agencies:search',    (_, args) => db.agenciesSearch(args));
  ipcMain.handle('agencies:create',    (_, args) => db.agenciesCreate(args));
  ipcMain.handle('agencies:update',    (_, args) => db.agenciesUpdate(args));
  ipcMain.handle('agencies:delete',    (_, args) => db.agenciesDelete(args));
  ipcMain.handle('agencies:getGroups', (_, args) => db.agenciesGetGroups(args));

  // ── Tour Guides ────────────────────────────────────────────────────────────
  ipcMain.handle('guides:getAll',  (_, args) => db.guidesGetAll(args || {}));
  ipcMain.handle('guides:create',  (_, args) => db.guidesCreate(args));
  ipcMain.handle('guides:update',  (_, args) => db.guidesUpdate(args));
  ipcMain.handle('guides:delete',  (_, args) => db.guidesDelete(args));

  ipcMain.handle('fiche:printGroup', async (_, { reservationId, groupId }) => {
    try {
      let prop, groupMeta, guests;

      if (groupId) {
        // Print all guests across all rooms for this group
        const group = db.prepare(`SELECT * FROM groups WHERE id = ?`).get(groupId);
        if (!group) return { ok: false, error: 'Groupe introuvable' };

        const firstRes = db.prepare(`
          SELECT r.*, p.display_name, p.display_name_ar, p.address, p.city, p.phone, p.fax
          FROM reservations r
          LEFT JOIN properties p ON r.property_id = p.id
          WHERE r.group_id = ? AND r.deleted_at IS NULL LIMIT 1
        `).get(groupId);
        if (!firstRes) return { ok: false, error: 'Aucune réservation pour ce groupe' };

        prop = {
          display_name_fr: firstRes.display_name || '',
          display_name_ar: firstRes.display_name_ar || null,
          address: firstRes.address || '',
          bp: firstRes.city || '',
          phone: firstRes.phone || '',
          fax: firstRes.fax || '',
        };
        groupMeta = {
          name: group.name || '',
          leader_name: group.leader_name || '',
          leader_role: group.leader_role || '',
          leader_phone: group.leader_phone || '',
          check_in_date: group.check_in_date || '',
          check_out_date: group.check_out_date || '',
          coming_from: group.coming_from || '',
          going_to: group.going_to || '',
        };
        guests = db.prepare(`
          SELECT g.last_name, g.first_name, g.date_of_birth, g.nationality,
            g.document_type, g.document_number,
            rg.morocco_entry_number,
            rm.room_number
          FROM reservations r
          JOIN rooms rm ON rm.id = r.room_id
          JOIN reservation_guests rg ON rg.reservation_id = r.id
          JOIN guests g ON g.id = rg.guest_id
          WHERE r.group_id = ? AND r.deleted_at IS NULL
          ORDER BY g.nationality, g.last_name
        `).all(groupId);
      } else {
        // Backward compat: single reservation
        const res = db.prepare(`
          SELECT r.*,
            rm.room_number,
            p.display_name, p.display_name_ar, p.address, p.city, p.phone, p.fax
          FROM reservations r
          LEFT JOIN rooms rm ON r.room_id = rm.id
          LEFT JOIN properties p ON r.property_id = p.id
          WHERE r.id = ?
        `).get(reservationId);
        if (!res) return { ok: false, error: 'Réservation introuvable' };

        prop = {
          display_name_fr: res.display_name || '',
          display_name_ar: res.display_name_ar || null,
          address: res.address || '',
          bp: res.city || '',
          phone: res.phone || '',
          fax: res.fax || '',
        };
        groupMeta = {
          check_in_date: res.check_in_date || '',
          check_out_date: res.check_out_date || '',
          coming_from: res.coming_from || '',
          going_to: res.going_to || '',
        };
        guests = db.prepare(`
          SELECT g.last_name, g.first_name, g.date_of_birth, g.nationality,
            g.document_type, g.document_number,
            rg.morocco_entry_number,
            rm.room_number
          FROM reservation_guests rg
          JOIN guests g ON g.id = rg.guest_id
          JOIN reservations r ON r.id = rg.reservation_id
          JOIN rooms rm ON rm.id = r.room_id
          WHERE rg.reservation_id = ?
          ORDER BY g.nationality, g.last_name
        `).all(reservationId);
      }

      const html = generateGroupFicheHTML({
        property: prop,
        group: groupMeta,
        guests,
      });

      const printWin = new BrowserWindow({
        width: 794, height: 1123, show: false,
        webPreferences: { nodeIntegration: false, contextIsolation: true },
      });
      const encoded = encodeURIComponent(html);
      await printWin.loadURL(`data:text/html;charset=utf-8,${encoded}`);
      await new Promise(resolve => setTimeout(resolve, 1500));

      return await new Promise(resolve => {
        printWin.webContents.print(
          { silent: false, printBackground: true, pageSize: 'A4', margins: { marginType: 'none' } },
          (success, errorType) => {
            printWin.close();
            resolve(success ? { ok: true } : { ok: false, error: errorType || 'Erreur impression' });
          }
        );
      });
    } catch (err) {
      console.error('[fiche:printGroup] error:', err);
      return { ok: false, error: err.message };
    }
  });

  // ── Clients ──────────────────────────────────────────────────────────────
  ipcMain.handle('clients:getAll',  (_, args) => db.clientsGetAll(args));
  ipcMain.handle('clients:create',  (_, args) => db.clientsCreate(args));

  // ── Invoices ─────────────────────────────────────────────────────────────
  ipcMain.handle('invoices:getAll',    (_, args) => db.invoicesGetAll(args));
  ipcMain.handle('invoices:getById',   (_, args) => db.invoicesGetById(args));
  ipcMain.handle('invoices:create',    (_, args) => db.invoicesCreate(args));
  ipcMain.handle('invoices:addPayment',(_, args) => db.invoicesAddPayment(args));

  ipcMain.handle('invoices:print', async (_, { id }) => {
    const inv = db.invoicesGetById({ id });
    if (!inv) return { ok: false, error: 'Facture introuvable' };
    const prop = db.prepare(`SELECT * FROM properties WHERE id = ?`).get(inv.property_id) || {};

    // Map stored item fields to template fields
    const items = (inv.items || []).map(it => ({
      quantite:         it.qty  || it.quantite  || 1,
      designation:      it.description || it.designation || '',
      nb_nuitee:        it.nb_nuitee   || null,
      prix_unitaire_ht: it.unit_price  ?? it.prix_unitaire_ht ?? 0,
      prix_total_ht:    it.total       ?? it.prix_total_ht    ?? 0,
    }));

    const agency = inv.agency_name ? {
      name:    inv.agency_name,
      country: inv.agency_country,
      city:    inv.agency_city,
      ice:     inv.agency_ice || null,
    } : null;

    const guide = inv.guide_name ? {
      name:  inv.guide_name,
      phone: inv.guide_phone,
      role:  inv.guide_role,
    } : null;

    const client = !agency && inv.client_name ? { name: inv.client_name, ice: inv.client_ice } : null;

    const html = generateInvoiceHTML({
      invoice:  { ...inv, number: inv.invoice_number, subtotal_ht: inv.subtotal, total_ttc: inv.total },
      items,
      property: prop,
      client,
      agency,
      guide,
    });

    const tmpPath = path.join(os.tmpdir(), `invoice-${Date.now()}.html`);
    fs.writeFileSync(tmpPath, html, 'utf8');
    const printWin = new BrowserWindow({ width: 794, height: 1123, show: false,
      webPreferences: { nodeIntegration: false, contextIsolation: true } });
    await printWin.loadFile(tmpPath);
    await new Promise(r => setTimeout(r, 600));
    printWin.webContents.print({ silent: false, printBackground: true, pageSize: 'A4' },
      () => { printWin.close(); fs.unlink(tmpPath, () => {}); });
    return { ok: true };
  });

  ipcMain.handle('invoices:generateNumber', (_, { type, property_id }) => {
    return db.invoicesGenerateNumber({ type, property_id });
  });

  // ── Channels / iCal ─────────────────────────────────────────────────────

  ipcMain.handle('channels:saveOTA', (_, args) => db.otaSaveConnection(args));
  ipcMain.handle('channels:removeOTA', (_, args) => db.otaRemoveConnection(args));
  ipcMain.handle('channels:getCalendar', (_, args) => db.otaBlocksGetCalendar(args));
  ipcMain.handle('channels:checkAvailability', (_, args) => db.otaCheckAvailability(args));

  ipcMain.handle('channels:testURL', async (_, { url }) => {
    try {
      const events = await fetchICalEvents(url);
      return { ok: true, eventCount: events.length };
    } catch (err) {
      return { ok: false, error: err.message };
    }
  });

  ipcMain.handle('channels:syncOne', async (_, { property_id, ota_id }) => {
    const property = db.prepare(`SELECT * FROM properties WHERE id = ?`).get(property_id);
    if (!property) return { ok: false, error: 'Propriété introuvable' };
    const otas = JSON.parse(property.otas || '[]');
    const ota = otas.find(o => o.id === ota_id);
    if (!ota) return { ok: false, error: 'OTA introuvable' };
    const result = await syncOTA(db, property_id, ota, uuidv4);
    db.otaUpdateSyncStatus({
      property_id, ota_id,
      status: result.error ? 'error' : 'ok',
      last_synced: new Date().toISOString(),
      last_error: result.error || null,
    });
    return { ok: !result.error, ...result };
  });

  ipcMain.handle('channels:syncAll', async (_, { property_id }) => {
    const property = db.prepare(`SELECT * FROM properties WHERE id = ?`).get(property_id);
    if (!property) return { ok: false };
    const otas = JSON.parse(property.otas || '[]');
    const results = {};
    for (const ota of otas) {
      const result = await syncOTA(db, property_id, ota, uuidv4);
      results[ota.id] = result;
      db.otaUpdateSyncStatus({
        property_id, ota_id: ota.id,
        status: result.error ? 'error' : 'ok',
        last_synced: new Date().toISOString(),
        last_error: result.error || null,
      });
    }
    if (mainWindow) mainWindow.webContents.send('channels:syncComplete', { property_id });
    return { ok: true, results };
  });

  ipcMain.handle('channels:generateExportFeed', async (_, { property_id }) => {
    const property = db.prepare(`SELECT * FROM properties WHERE id = ?`).get(property_id);
    if (!property) return { ok: false, error: 'Propriété introuvable' };

    const reservations = db.prepare(`
      SELECT r.*, g.last_name, g.first_name, rm.room_number
      FROM reservations r
      LEFT JOIN guests g ON r.guest_id = g.id
      LEFT JOIN rooms rm ON r.room_id = rm.id
      WHERE r.property_id = ? AND r.deleted_at IS NULL
        AND r.status NOT IN ('cancelled','no_show')
        AND r.check_out_date >= date('now')
    `).all(property_id);

    const icalGen = getIcalGenerator();
    const cal = icalGen({ name: `RbitRate – ${property.display_name}`, timezone: 'Africa/Casablanca' });

    for (const res of reservations) {
      cal.createEvent({
        uid: res.id,
        start: new Date(res.check_in_date + 'T12:00:00'),
        end:   new Date(res.check_out_date + 'T12:00:00'),
        allDay: true,
        summary: `[RbitRate] ${res.last_name || ''} ${res.first_name || ''} – Ch.${res.room_number}`,
        description: `Canal: ${res.channel || 'direct'}`,
      });
    }

    const icsContent = cal.toString();
    const { canceled, filePath } = await dialog.showSaveDialog({
      title: 'Exporter le calendrier RbitRate',
      defaultPath: `rbitrate-${property.display_name.replace(/[^a-z0-9]/gi, '-')}-${new Date().toISOString().split('T')[0]}.ics`,
      filters: [{ name: 'iCalendar', extensions: ['ics'] }],
    });
    if (canceled || !filePath) return { ok: false, error: 'Annulé' };
    fs.writeFileSync(filePath, icsContent, 'utf8');
    return { ok: true, path: filePath, eventCount: reservations.length };
  });

  ipcMain.handle('channels:stopAutoSync', () => {
    if (syncInterval) { clearInterval(syncInterval); syncInterval = null; }
    return { ok: true };
  });

  // ── Auto-sync every 30 minutes ───────────────────────────────────────────
  function startAutoSync() {
    if (syncInterval) return;
    syncInterval = setInterval(async () => {
      const properties = db.prepare(
        `SELECT id, otas FROM properties WHERE active = 1 AND deleted_at IS NULL`
      ).all();
      for (const prop of properties) {
        const otas = JSON.parse(prop.otas || '[]').filter(o => o.import_url);
        if (!otas.length) continue;
        for (const ota of otas) {
          try {
            const result = await syncOTA(db, prop.id, ota, uuidv4);
            db.otaUpdateSyncStatus({
              property_id: prop.id, ota_id: ota.id,
              status: result.error ? 'error' : 'ok',
              last_synced: new Date().toISOString(),
              last_error: result.error || null,
            });
          } catch (e) {
            console.error('Auto-sync error:', e.message);
          }
        }
        if (mainWindow) mainWindow.webContents.send('channels:syncComplete', { property_id: prop.id });
      }
    }, 30 * 60 * 1000);
  }

  // ── Shift reminder notifications ─────────────────────────────────────────
  function checkShiftReminders() {
    try {
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      const today = now.toISOString().split('T')[0];

      const upcoming = db.scheduleGetUpcomingShifts();
      for (const schedule of upcoming) {
        if (!schedule.start_time) continue;
        const [h, m] = schedule.start_time.split(':').map(Number);
        const minutesUntil = (h * 60 + m) - currentMinutes;
        if (minutesUntil >= 28 && minutesUntil <= 32) {
          if (db.scheduleNotificationAlreadySent({ staff_id: schedule.staff_id, date: today })) continue;

          if (Notification.isSupported()) {
            new Notification({
              title: '⏰ Shift dans 30 minutes — RbitRate',
              body: `${schedule.full_name} — Shift ${schedule.shift_type === 'day' ? 'Jour' : 'Nuit'} commence à ${schedule.start_time}`,
            }).show();
          }

          if (mainWindow) {
            mainWindow.webContents.send('schedule:shiftReminder', {
              staff_id: schedule.staff_id,
              full_name: schedule.full_name,
              shift_type: schedule.shift_type,
              start_time: schedule.start_time,
            });
          }
          db.scheduleMarkNotificationSent({
            staff_id: schedule.staff_id,
            property_id: schedule.property_id,
            date: today,
            shift_type: schedule.shift_type,
          });
        }
      }
    } catch (e) {
      console.error('[reminders] checkShiftReminders error:', e.message);
    }
  }

  setInterval(checkShiftReminders, 5 * 60 * 1000);
  setTimeout(checkShiftReminders, 12000);

  // ── Menu ────────────────────────────────────────────────────────────────
  ipcMain.handle('menu:getCategories',   (_, args) => db.menuGetCategories(args));
  ipcMain.handle('menu:createCategory',  (_, args) => db.menuCreateCategory(args));
  ipcMain.handle('menu:updateCategory',  (_, args) => db.menuUpdateCategory(args));
  ipcMain.handle('menu:deleteCategory',  (_, args) => db.menuDeleteCategory(args));
  ipcMain.handle('menu:getItems',        (_, args) => db.menuGetItems(args));
  ipcMain.handle('menu:createItem',      (_, args) => db.menuCreateItem(args));
  ipcMain.handle('menu:updateItem',      (_, args) => db.menuUpdateItem(args));
  ipcMain.handle('menu:toggleAvailable', (_, args) => db.menuToggleAvailable(args));

  // ── Formulas ─────────────────────────────────────────────────────────────
  ipcMain.handle('formulas:getAll',        (_, args) => db.formulasGetAll(args));
  ipcMain.handle('formulas:getWithCourses',(_, args) => db.formulasGetWithCourses(args));
  ipcMain.handle('formulas:create',        (_, args) => db.formulasCreate(args));
  ipcMain.handle('formulas:update',        (_, args) => db.formulasUpdate(args));
  ipcMain.handle('formulas:addCourse',     (_, args) => db.formulasAddCourse(args));
  ipcMain.handle('formulas:deleteCourse',  (_, args) => db.formulasDeleteCourse(args));
  ipcMain.handle('formulas:addOption',     (_, args) => db.formulasAddOption(args));
  ipcMain.handle('formulas:deleteOption',  (_, args) => db.formulasDeleteOption(args));
  ipcMain.handle('formulas:toggle',        (_, args) => db.formulasToggle(args));
  ipcMain.handle('formulas:delete',        (_, args) => db.formulasDelete(args));
  ipcMain.handle('menu:deleteItem',      (_, args) => db.menuDeleteItem(args));

  // ── Scheduling ──────────────────────────────────────────────────────────
  ipcMain.handle('schedules:getRange',        (_, args) => db.scheduleGetRange(args));
  ipcMain.handle('schedules:setDay',          (_, args) => db.scheduleSetDay(args));
  ipcMain.handle('schedules:autoGenerate',    (_, args) => db.scheduleAutoGenerate(args));
  ipcMain.handle('schedules:getTodayForStaff',(_, args) => db.scheduleGetTodayForStaff(args));
  ipcMain.handle('schedules:getWeekForStaff', (_, args) => db.scheduleGetWeekForStaff(args));

  // ── Rotation templates ───────────────────────────────────────────────────
  ipcMain.handle('templates:getAll',   (_, args) => db.templatesGetAll(args));
  ipcMain.handle('templates:create',   (_, args) => db.templatesCreate(args));
  ipcMain.handle('templates:update',   (_, args) => db.templatesUpdate(args));
  ipcMain.handle('templates:delete',   (_, args) => db.templatesDelete(args));

  // ── Time off ─────────────────────────────────────────────────────────────
  ipcMain.handle('timeoff:create',  (_, args) => db.timeoffCreate(args));
  ipcMain.handle('timeoff:getAll',  (_, args) => db.timeoffGetAll(args));
  ipcMain.handle('timeoff:review',  (_, args) => db.timeoffReview(args));
  ipcMain.handle('timeoff:delete',  (_, args) => db.timeoffDelete(args));

  // ── Tables / QR ─────────────────────────────────────────────────────────
  ipcMain.handle('tables:getAll',  (_, args) => db.tablesGetAll(args));
  ipcMain.handle('tables:create',  (_, args) => db.tablesCreate(args));
  ipcMain.handle('tables:delete',  (_, args) => db.tablesDelete(args));

  ipcMain.handle('qr:generate', async (_, { url }) => {
    const dataUrl = await QRCode.toDataURL(url, {
      width: 300,
      margin: 2,
      color: { dark: '#1f2a2e', light: '#faf7f2' },
    });
    return { dataUrl };
  });

  // ── Orders ───────────────────────────────────────────────────────────────
  ipcMain.handle('orders:getActive',    (_, args) => db.ordersGetActive(args));
  ipcMain.handle('orders:updateStatus', (_, args) => db.ordersUpdateStatus(args));

  // ── Server info ─────────────────────────────────────────────────────────
  ipcMain.handle('server:getLocalIP', () => {
    const nets = os.networkInterfaces();
    for (const name of Object.keys(nets)) {
      for (const iface of nets[name]) {
        // family is 'IPv4' (string) on Node 20; guard against the Node 18.0 number form (4)
        const isV4 = iface.family === 'IPv4' || iface.family === 4;
        if (isV4 && !iface.internal) {
          return { ip: iface.address, port: ORDER_SERVER_PORT, orderPort: ORDER_SERVER_PORT, apiPort: MOBILE_API_PORT };
        }
      }
    }
    return { ip: '127.0.0.1', port: ORDER_SERVER_PORT, orderPort: ORDER_SERVER_PORT, apiPort: MOBILE_API_PORT };
  });

  // ── Local ordering HTTP server ───────────────────────────────────────────
  function startOrderServer() {
    if (orderServer) return;
    const menuPagePath = join(__dirname, 'menu-page.html');

    orderServer = http.createServer((req, res) => {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

      const url = new URL(req.url, `http://localhost:${ORDER_SERVER_PORT}`);

      if (req.method === 'GET' && url.pathname === '/menu') {
        const propertyId = url.searchParams.get('p') || '';
        const tableId    = url.searchParams.get('t') || '';
        const tableLabel = decodeURIComponent(url.searchParams.get('l') || 'Table');
        try {
          let html = fs.readFileSync(menuPagePath, 'utf8');
          html = html
            .replace(/__PROPERTY_ID__/g, propertyId)
            .replace(/__TABLE_ID__/g,    tableId)
            .replace(/__TABLE_LABEL__/g, tableLabel);
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          res.end(html);
        } catch (_) {
          res.writeHead(404); res.end('Menu page not found');
        }
        return;
      }

      if (req.method === 'GET' && url.pathname === '/api/menu') {
        try {
          const propertyId = url.searchParams.get('p') || '';
          const { categories, formulas, property } = db.menuGetPublicMenu({ property_id: propertyId });
          res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ categories, formulas, property }));
        } catch (e) {
          res.writeHead(500); res.end(JSON.stringify({ error: e.message }));
        }
        return;
      }

      if (req.method === 'POST' && url.pathname === '/api/order') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
          try {
            const data = JSON.parse(body);
            const { id } = db.ordersCreate({
              property_id: data.property_id,
              table_id: data.table_id || null,
              table_label: data.table_label,
              notes: data.notes || null,
              session_token: data.session_token,
              items: data.items || [],
            });
            if (mainWindow) mainWindow.webContents.send('orders:new', { order_id: id });
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: true, order_id: id }));
          } catch (e) {
            res.writeHead(400); res.end(JSON.stringify({ ok: false, error: e.message }));
          }
        });
        return;
      }

      res.writeHead(404); res.end('Not found');
    });

    orderServer.on('error', (e) => console.error('Order server error:', e.message));
    orderServer.listen(ORDER_SERVER_PORT, '0.0.0.0', () => {
      console.log(`Order server running on port ${ORDER_SERVER_PORT}`);
    });
  }

  // ── Mobile API server (port 3722) ───────────────────────────────────────
  function startMobileServer() {
    if (mobileServer) return;
    const sessions = {};

    const readBody = (req) => new Promise(resolve => {
      let data = '';
      req.on('data', c => { data += c; });
      req.on('end', () => { try { resolve(JSON.parse(data)); } catch { resolve({}); } });
    });

    mobileServer = http.createServer(async (req, res) => {
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return; }

      const url    = new URL(req.url, `http://localhost:${MOBILE_API_PORT}`);
      const pth    = url.pathname;
      const token  = (req.headers.authorization || '').replace('Bearer ', '');
      const propId = url.searchParams.get('property_id') || '';

      const ok  = d        => { res.writeHead(200); res.end(JSON.stringify(d)); };
      const err = (m, c=400) => { res.writeHead(c); res.end(JSON.stringify({ error: m })); };
      const authStaff = () => token && sessions[token] ? sessions[token] : null;

      try {
        // ── AUTH ──────────────────────────────────────────────────────────
        if (pth === '/api/auth/staff-list' && req.method === 'GET') {
          return ok(db.prepare(`SELECT id, full_name, role FROM staff WHERE active = 1 AND deleted_at IS NULL ORDER BY full_name`).all());
        }

        if (pth === '/api/auth/login' && req.method === 'POST') {
          const { staff_id, pin } = await readBody(req);
          const staff = db.prepare(`SELECT * FROM staff WHERE id = ? AND pin_code = ? AND active = 1`).get(staff_id, pin);
          if (!staff) return err('PIN incorrect', 401);
          const tok = crypto.randomBytes(16).toString('hex');
          sessions[tok] = { id: staff.id, full_name: staff.full_name, role: staff.role };
          return ok({ token: tok, staff: { id: staff.id, full_name: staff.full_name, role: staff.role } });
        }

        const me = authStaff();
        if (!me) return err('Non autorisé', 401);

        // ── PROPERTIES ────────────────────────────────────────────────────
        if (pth === '/api/properties' && req.method === 'GET') {
          return ok(db.prepare(`SELECT id, display_name, type, city FROM properties WHERE active = 1 AND deleted_at IS NULL`).all());
        }

        // ── DASHBOARD ─────────────────────────────────────────────────────
        if (pth === '/api/dashboard' && req.method === 'GET') {
          const rooms       = db.prepare(`SELECT status, COUNT(*) as count FROM rooms WHERE property_id = ? AND deleted_at IS NULL GROUP BY status`).all(propId);
          const todayIncome = db.prepare(`SELECT COALESCE(SUM(amount),0) as total FROM transactions WHERE property_id = ? AND type='income' AND date(created_at)=date('now') AND deleted_at IS NULL`).get(propId);
          const todayExp    = db.prepare(`SELECT COALESCE(SUM(amount),0) as total FROM transactions WHERE property_id = ? AND type='expense' AND date(created_at)=date('now') AND deleted_at IS NULL`).get(propId);
          const arrivals    = db.prepare(`SELECT COUNT(*) as count FROM reservations WHERE property_id = ? AND check_in_date=date('now') AND deleted_at IS NULL`).get(propId);
          const departures  = db.prepare(`SELECT COUNT(*) as count FROM reservations WHERE property_id = ? AND check_out_date=date('now') AND status='checked_in' AND deleted_at IS NULL`).get(propId);
          return ok({ rooms, todayIncome: todayIncome.total, todayExpense: todayExp.total, arrivals: arrivals.count, departures: departures.count });
        }

        // ── ROOMS ─────────────────────────────────────────────────────────
        if (pth === '/api/rooms' && req.method === 'GET') {
          return ok(db.prepare(`
            SELECT r.*, g.last_name, g.first_name,
              res.check_out_date, res.id as reservation_id, res.total_amount, res.paid_amount
            FROM rooms r
            LEFT JOIN reservations res ON res.room_id = r.id AND res.status = 'checked_in' AND res.deleted_at IS NULL
            LEFT JOIN guests g ON res.guest_id = g.id
            WHERE r.property_id = ? AND r.deleted_at IS NULL ORDER BY r.room_number ASC
          `).all(propId));
        }

        if (pth.startsWith('/api/rooms/') && req.method === 'PUT') {
          const room_id = pth.split('/')[3];
          const { status } = await readBody(req);
          db.prepare(`UPDATE rooms SET status = ?, updated_at = datetime('now') WHERE id = ?`).run(status, room_id);
          return ok({ ok: true });
        }

        // ── GUESTS ────────────────────────────────────────────────────────
        if (pth === '/api/guests/search' && req.method === 'GET') {
          const q = url.searchParams.get('q') || '';
          return ok(db.prepare(`
            SELECT * FROM guests WHERE deleted_at IS NULL
            AND (lower(last_name) LIKE lower(?) OR lower(first_name) LIKE lower(?) OR lower(document_number) LIKE lower(?))
            ORDER BY last_name ASC LIMIT 15
          `).all(`%${q}%`, `%${q}%`, `%${q}%`));
        }

        if (pth.startsWith('/api/guests/') && req.method === 'GET') {
          const id    = pth.split('/')[3];
          const guest = db.prepare(`SELECT * FROM guests WHERE id = ?`).get(id);
          const history = db.prepare(`
            SELECT r.*, rm.room_number, rm.room_name, p.display_name as property_name
            FROM reservations r
            LEFT JOIN rooms rm ON r.room_id = rm.id
            LEFT JOIN properties p ON r.property_id = p.id
            WHERE r.guest_id = ? AND r.deleted_at IS NULL ORDER BY r.check_in_date DESC LIMIT 10
          `).all(id);
          return ok({ guest, history });
        }

        if (pth === '/api/guests' && req.method === 'POST') {
          const d = await readBody(req);
          const id = uuidv4();
          db.prepare(`
            INSERT INTO guests (id, last_name, first_name, date_of_birth, place_of_birth,
              nationality, profession, permanent_address, document_type, document_number,
              document_issued_at, document_issued_date, phone, email, tag)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(id, d.last_name, d.first_name, d.date_of_birth || null, d.place_of_birth || null,
            d.nationality || null, d.profession || null, d.permanent_address || null,
            d.document_type || null, d.document_number || null,
            d.document_issued_at || null, d.document_issued_date || null,
            d.phone || null, d.email || null, d.tag || 'regular');
          return ok({ id });
        }

        // ── CHECK-IN ─────────────────────────────────────────────────────
        if (pth === '/api/checkin' && req.method === 'POST') {
          const d = await readBody(req);
          let guestId = d.guest_id;
          if (!guestId) {
            guestId = uuidv4();
            const g = d.guest || {};
            db.prepare(`
              INSERT INTO guests (id, last_name, first_name, date_of_birth, place_of_birth,
                nationality, profession, permanent_address, document_type, document_number,
                document_issued_at, document_issued_date, tag)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'regular')
            `).run(guestId, g.last_name, g.first_name, g.date_of_birth || null, g.place_of_birth || null,
              g.nationality || null, g.profession || null, g.permanent_address || null,
              g.document_type || null, g.document_number || null,
              g.document_issued_at || null, g.document_issued_date || null);
          }
          const resId  = uuidv4();
          const nights = Math.max(1, Math.round((new Date(d.check_out_date) - new Date(d.check_in_date)) / 86400000));
          const total  = (d.price_per_night || 0) * nights;
          db.prepare(`
            INSERT INTO reservations
              (id, property_id, room_id, guest_id, check_in_date, check_out_date,
               arrival_time, nights, coming_from, going_to, morocco_entry_number,
               adults, children, price_per_night, total_amount, payment_type, status, channel)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'checked_in', ?)
          `).run(resId, d.property_id, d.room_id, guestId,
            d.check_in_date, d.check_out_date, d.arrival_time || null, nights,
            d.coming_from || null, d.going_to || null, d.morocco_entry_number || null,
            d.adults || 1, d.children || 0, d.price_per_night || 0, total,
            d.payment_type || 'checkout', d.channel || 'direct');
          db.prepare(`UPDATE rooms SET status = 'occupied', updated_at = datetime('now') WHERE id = ?`).run(d.room_id);
          db.prepare(`UPDATE guests SET total_stays = total_stays + 1 WHERE id = ?`).run(guestId);
          return ok({ reservation_id: resId, guest_id: guestId, total });
        }

        // ── CHECK-OUT ─────────────────────────────────────────────────────
        if (pth === '/api/checkout' && req.method === 'POST') {
          const { reservation_id, room_id, amount, payment_method, shift_id } = await readBody(req);
          db.prepare(`UPDATE reservations SET status = 'checked_out', paid_amount = paid_amount + ?, updated_at = datetime('now') WHERE id = ?`).run(amount || 0, reservation_id);
          db.prepare(`UPDATE rooms SET status = 'cleaning', updated_at = datetime('now') WHERE id = ?`).run(room_id);
          if (amount > 0 && shift_id) {
            db.prepare(`
              INSERT INTO transactions (id, shift_id, property_id, reservation_id, type, category, amount, payment_method, description, recorded_by)
              VALUES (?, ?, ?, ?, 'income', 'room_revenue', ?, ?, 'Check-out mobile', ?)
            `).run(uuidv4(), shift_id, propId, reservation_id, amount, payment_method || 'cash', me.id);
          }
          return ok({ ok: true });
        }

        // ── SHIFTS ────────────────────────────────────────────────────────
        if (pth === '/api/shifts/active' && req.method === 'GET') {
          return ok(db.prepare(`
            SELECT s.*, st.full_name, st.role FROM shifts s
            LEFT JOIN staff st ON s.staff_id = st.id
            WHERE s.property_id = ? AND s.status = 'open' AND s.deleted_at IS NULL
          `).all(propId));
        }

        if (pth === '/api/shifts/open' && req.method === 'POST') {
          const { opening_cash } = await readBody(req);
          const existing = db.prepare(`SELECT id FROM shifts WHERE staff_id = ? AND property_id = ? AND status = 'open'`).get(me.id, propId);
          if (existing) return err('Shift déjà ouvert');
          const id = uuidv4();
          db.prepare(`INSERT INTO shifts (id, staff_id, property_id, opening_cash, status) VALUES (?, ?, ?, ?, 'open')`)
            .run(id, me.id, propId, opening_cash || 0);
          return ok({ id });
        }

        // ── TRANSACTIONS ─────────────────────────────────────────────────
        if (pth === '/api/transactions' && req.method === 'GET') {
          const shift_id = url.searchParams.get('shift_id');
          if (!shift_id) return err('shift_id requis');
          return ok(db.prepare(`
            SELECT t.*, st.full_name FROM transactions t
            LEFT JOIN staff st ON t.recorded_by = st.id
            WHERE t.shift_id = ? AND t.deleted_at IS NULL ORDER BY t.created_at ASC
          `).all(shift_id));
        }

        if (pth === '/api/transactions' && req.method === 'POST') {
          const d = await readBody(req);
          const shift = db.prepare(`SELECT id FROM shifts WHERE id = ? AND status = 'open'`).get(d.shift_id);
          if (!shift) return err('Shift fermé');
          const id = uuidv4();
          db.prepare(`
            INSERT INTO transactions (id, shift_id, property_id, reservation_id, type, category, amount, payment_method, description, recorded_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `).run(id, d.shift_id, d.property_id || propId, d.reservation_id || null,
            d.type, d.category, d.amount, d.payment_method || 'cash', d.description || null, me.id);
          return ok({ id });
        }

        // ── ORDERS (kitchen tablet) ───────────────────────────────────────
        if (pth === '/api/orders/active' && req.method === 'GET') {
          const orders = db.prepare(`
            SELECT o.*, json_group_array(json_object(
              'item_name_fr', oi.item_name_fr, 'quantity', oi.quantity, 'notes', oi.notes
            )) as items_json
            FROM orders o LEFT JOIN order_items oi ON oi.order_id = o.id
            WHERE o.property_id = ? AND o.status NOT IN ('served','cancelled') AND o.deleted_at IS NULL
            GROUP BY o.id ORDER BY o.created_at ASC
          `).all(propId);
          return ok(orders.map(o => ({ ...o, items: JSON.parse(o.items_json).filter(i => i.item_name_fr) })));
        }

        if (pth.startsWith('/api/orders/') && req.method === 'PUT') {
          const order_id = pth.split('/')[3];
          const { status, shift_id } = await readBody(req);
          db.prepare(`UPDATE orders SET status = ?, updated_at = datetime('now') WHERE id = ?`).run(status, order_id);
          if (status === 'served' && shift_id) {
            const order = db.prepare(`SELECT * FROM orders WHERE id = ?`).get(order_id);
            if (order?.total_amount > 0) {
              db.prepare(`INSERT INTO transactions (id, shift_id, property_id, type, category, amount, payment_method, description) VALUES (?, ?, ?, 'income', 'fnb', ?, 'cash', ?)`)
                .run(uuidv4(), shift_id, order.property_id, order.total_amount, `Restaurant – ${order.table_label}`);
            }
          }
          return ok({ ok: true });
        }

        res.writeHead(404); res.end(JSON.stringify({ error: 'Route not found' }));
      } catch (e) {
        console.error('Mobile API error:', e.message);
        res.writeHead(500); res.end(JSON.stringify({ error: e.message }));
      }
    });

    mobileServer.on('error', (e) => console.error('Mobile server error:', e.message));
    mobileServer.listen(MOBILE_API_PORT, '0.0.0.0');
  }

  startOrderServer();
  startMobileServer();

  mainWindow = createWindow();
  startAutoSync();

  // ── Supabase background sync every 2 minutes ─────────────────────────
  if (syncEngine) {
    runSupabaseSync();
    supabaseSyncInterval = setInterval(runSupabaseSync, 2 * 60 * 1000);
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) { mainWindow = createWindow(); }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
