const DEFAULT_PERMISSIONS = {
  owner: {
    can_edit_rooms: true, can_view_all_finances: true, can_manage_all_shifts: true,
    can_manage_clients: true, can_view_invoices: true, can_manage_ota: true,
    can_manage_restaurant_menu: true, can_view_kitchen: true,
    can_manage_properties: true, can_manage_staff: true,
  },
  manager: {
    can_edit_rooms: true, can_view_all_finances: true, can_manage_all_shifts: true,
    can_manage_clients: true, can_view_invoices: true, can_manage_ota: true,
    can_manage_restaurant_menu: true, can_view_kitchen: true,
    can_manage_properties: false, can_manage_staff: false,
  },
  receptionist: {
    can_edit_rooms: false, can_view_all_finances: false, can_manage_all_shifts: false,
    can_manage_clients: false, can_view_invoices: false, can_manage_ota: false,
    can_manage_restaurant_menu: false, can_view_kitchen: true,
    can_manage_properties: false, can_manage_staff: false,
  },
};

export function getResolvedPermissions(staffRecord) {
  if (!staffRecord) return {};
  if (staffRecord.role === 'owner') return { ...DEFAULT_PERMISSIONS.owner };
  const defaults = DEFAULT_PERMISSIONS[staffRecord.role] || DEFAULT_PERMISSIONS.receptionist;
  let custom = {};
  try { custom = JSON.parse(staffRecord.permissions || '{}'); } catch (_) {}
  return { ...defaults, ...custom };
}

export function can(permission) {
  const staff = JSON.parse(localStorage.getItem('rbitrate_staff') || 'null');
  if (!staff) return false;
  if (staff.role === 'owner') return true;
  const perms = JSON.parse(localStorage.getItem('rbitrate_permissions') || '{}');
  return !!perms[permission];
}
