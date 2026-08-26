const SUPABASE_URL = 'https://cviupkndhukckzqctofb.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN2aXVwa25kaHVrY2t6cWN0b2ZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4NjIzMzEsImV4cCI6MjA5NzQzODMzMX0.a79IbXIrjbNnRagv2xxhnw2WBbFDhkQwESwwV-M7UTE';

export default async function handler(req, res) {
  const { p: propertyId } = req.query;
  if (!propertyId) {
    return res.status(400).send('property_id required');
  }

  const headers = {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
  };

  const today = new Date().toISOString().split('T')[0];

  const [resResponse, propResponse] = await Promise.all([
    fetch(
      `${SUPABASE_URL}/rest/v1/reservations?property_id=eq.${propertyId}&check_out_date=gte.${today}&status=neq.cancelled&deleted_at=is.null&select=*,guests(last_name,first_name),rooms(room_number)`,
      { headers }
    ),
    fetch(
      `${SUPABASE_URL}/rest/v1/properties?id=eq.${propertyId}&select=display_name`,
      { headers }
    ),
  ]);

  const reservations = await resResponse.json();
  const [property] = await propResponse.json();

  const now = new Date().toISOString().replace(/[-:.]/g, '').slice(0, 15) + 'Z';

  const events = (Array.isArray(reservations) ? reservations : []).map(r => {
    const dtStart = (r.check_in_date || '').replace(/-/g, '');
    const dtEnd   = (r.check_out_date || '').replace(/-/g, '');
    const guest   = r.guests
      ? `${r.guests.last_name || ''} ${r.guests.first_name || ''}`.trim()
      : 'Réservation';
    const room    = r.rooms ? ` - Ch.${r.rooms.room_number}` : '';
    const summary = esc(`[RbitRate] ${guest}${room}`);

    return [
      'BEGIN:VEVENT',
      `UID:${r.id}@rbitrate`,
      `DTSTART;VALUE=DATE:${dtStart}`,
      `DTEND;VALUE=DATE:${dtEnd}`,
      `SUMMARY:${summary}`,
      'STATUS:CONFIRMED',
      `DTSTAMP:${now}`,
      `LAST-MODIFIED:${now}`,
      'END:VEVENT',
    ].join('\r\n');
  });

  const calName = esc(`RbitRate - ${property?.display_name || 'Hotel'}`);

  const ical = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//RbitRate//Hotel PMS//FR',
    `X-WR-CALNAME:${calName}`,
    'X-WR-TIMEZONE:Africa/Casablanca',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'REFRESH-INTERVAL;VALUE=DURATION:PT1H',
    ...events,
    'END:VCALENDAR',
  ].join('\r\n');

  res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Content-Disposition', 'inline; filename="rbitrate.ics"');
  res.status(200).send(ical);
}

// Escape iCal text field special characters
function esc(s) {
  return String(s)
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}
