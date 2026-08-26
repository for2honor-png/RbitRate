'use strict';
const ical = require('node-ical');
const axios = require('axios');

async function fetchICalEvents(url) {
  const response = await axios.get(url, {
    timeout: 15000,
    headers: { 'User-Agent': 'RbitRate/1.0' },
  });
  const events = ical.parseICS(response.data);
  return Object.values(events).filter(e => e.type === 'VEVENT');
}

function parseEvent(event, sourceName, sourceUrl) {
  const toDateStr = (v) => {
    if (v instanceof Date) return v.toISOString().split('T')[0];
    return String(v).split('T')[0];
  };

  const start = toDateStr(event.start);
  const rawEnd = toDateStr(event.end);

  // iCal DTEND for all-day events is exclusive — adjust back one day
  const endDate = new Date(rawEnd + 'T12:00:00Z');
  endDate.setUTCDate(endDate.getUTCDate() - 1);
  const adjustedEnd = endDate.toISOString().split('T')[0];

  return {
    ical_uid:        event.uid || null,
    summary:         event.summary || ('Réservation ' + sourceName),
    start_date:      start,
    end_date:        adjustedEnd < start ? start : adjustedEnd,
    source_name:     sourceName,
    source_ical_url: sourceUrl,
  };
}

async function syncOTA(db, propertyId, ota, uuidv4) {
  if (!ota.import_url) return { added: 0, skipped: 0, error: null };

  let events;
  try {
    events = await fetchICalEvents(ota.import_url);
  } catch (err) {
    return { added: 0, skipped: 0, error: err.message };
  }

  const today = new Date().toISOString().split('T')[0];
  let added = 0, skipped = 0;

  for (const event of events) {
    const block = parseEvent(event, ota.name, ota.import_url);

    // Skip past events
    if (block.end_date < today) { skipped++; continue; }

    // Check for duplicate by ical_uid
    if (block.ical_uid) {
      const existing = db.prepare(
        `SELECT id FROM ota_blocks WHERE ical_uid = ? AND property_id = ? AND deleted_at IS NULL`
      ).get(block.ical_uid, propertyId);

      if (existing) {
        db.prepare(
          `UPDATE ota_blocks SET end_date = ?, summary = ?, synced_at = datetime('now') WHERE id = ?`
        ).run(block.end_date, block.summary, existing.id);
        skipped++;
        continue;
      }
    }

    db.prepare(`
      INSERT INTO ota_blocks (id, property_id, source_name, source_ical_url, start_date, end_date, summary, ical_uid)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(uuidv4(), propertyId, block.source_name, block.source_ical_url,
           block.start_date, block.end_date, block.summary, block.ical_uid);
    added++;
  }

  // Soft-delete blocks from this OTA no longer in the feed (cancelled bookings)
  const currentUids = events.map(e => e.uid).filter(Boolean);
  if (currentUids.length > 0) {
    const placeholders = currentUids.map(() => '?').join(',');
    db.prepare(`
      UPDATE ota_blocks SET deleted_at = datetime('now')
      WHERE property_id = ? AND source_name = ?
        AND ical_uid NOT IN (${placeholders})
        AND deleted_at IS NULL
    `).run(propertyId, ota.name, ...currentUids);
  }

  return { added, skipped, error: null };
}

module.exports = { syncOTA, fetchICalEvents };
