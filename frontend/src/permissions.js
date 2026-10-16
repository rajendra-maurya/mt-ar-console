export const PERMISSIONS = {
  EXPORT_CURRENT_VIEW: "export_current_view",
  EXPORT_AUDIT: "export_audit",
};

const ROLE_PERMISSIONS = {
  analyst: [PERMISSIONS.EXPORT_CURRENT_VIEW],
  lead: [PERMISSIONS.EXPORT_CURRENT_VIEW, PERMISSIONS.EXPORT_AUDIT],
  controller: [PERMISSIONS.EXPORT_CURRENT_VIEW, PERMISSIONS.EXPORT_AUDIT],
  admin: [PERMISSIONS.EXPORT_CURRENT_VIEW, PERMISSIONS.EXPORT_AUDIT],
};

export function hasPermission(role, permission) {
  return ROLE_PERMISSIONS[role?.toLowerCase()]?.includes(permission) ?? false;
}
