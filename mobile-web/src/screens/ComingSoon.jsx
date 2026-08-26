import { C } from '../theme';

// Placeholder for sidebar sections that exist on the Electron desktop app
// but don't have a mobile-web screen yet (Finances, Planning, Factures,
// Restaurant, Équipe, Propriétés). Keeps the nav item clickable instead of
// silently falling back to the dashboard.
export default function ComingSoon({ label }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      minHeight: '60vh', gap: 10, textAlign: 'center', padding: 24,
    }}>
      <div style={{ fontSize: 40 }}>🚧</div>
      <div style={{ fontSize: 16, fontWeight: 800, color: C.dark }}>{label}</div>
      <div style={{ fontSize: 13, color: C.gray, maxWidth: 320 }}>
        Cette section arrive bientôt sur la version web.
      </div>
    </div>
  );
}
