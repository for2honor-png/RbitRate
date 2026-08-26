const SUPABASE_URL = 'https://cviupkndhukckzqctofb.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN2aXVwa25kaHVrY2t6cWN0b2ZiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4NjIzMzEsImV4cCI6MjA5NzQzODMzMX0.a79IbXIrjbNnRagv2xxhnw2WBbFDhkQwESwwV-M7UTE';

const HEADERS = {
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
};

export async function sbSelect(table, since) {
  const query = since
    ? `?updated_at=gt.${encodeURIComponent(since)}&order=updated_at.asc&limit=500`
    : `?order=updated_at.asc&limit=500`;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}${query}`, {
    headers: HEADERS,
  });
  if (!res.ok) return [];
  return res.json();
}

export async function sbUpsert(table, rows) {
  if (!rows.length) return true;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: { ...HEADERS, 'Prefer': 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify(rows),
  });
  return res.ok;
}

export async function isOnline() {
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      headers: HEADERS,
      signal: AbortSignal.timeout(3000),
    });
    return r.status < 500;
  } catch {
    return false;
  }
}
