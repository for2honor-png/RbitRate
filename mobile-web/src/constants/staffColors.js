export const STAFF_COLORS = {
  owner:        { color: '#0f766e', bg: '#0f766e18', label: 'Propriétaire' },
  manager:      { color: '#7c5cbf', bg: '#7c5cbf18', label: 'Manager' },
  receptionist: { color: '#ff7f50', bg: '#ff7f5018', label: 'Réceptionniste' },
  chef:         { color: '#e0a458', bg: '#e0a45822', label: 'Chef' },
  accountant:   { color: '#1f2a2e', bg: '#1f2a2e12', label: 'Comptable' },
};

export function staffColor(role) {
  return STAFF_COLORS[role] || { color: '#6b7280', bg: '#6b728018', label: role || '?' };
}

export function staffInitials(fullName) {
  if (!fullName) return '?';
  const parts = fullName.trim().split(/\s+/);
  return parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : fullName.slice(0, 2).toUpperCase();
}
