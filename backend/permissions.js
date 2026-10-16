export const ROLES = {
  ANALYST: "analyst",
  LEAD: "lead",
  CONTROLLER: "controller",
  ADMIN: "admin",
};

export const PERMISSIONS = {
  VIEW_DASHBOARD: "view_dashboard",
  VIEW_INVOICES: "view_invoices",
  EDIT_WORKFLOW: "edit_workflow",
  EDIT_FINANCIAL: "edit_financial",
  MANAGE_DISPUTES: "manage_disputes",
  BULK_ACTIONS: "bulk_actions",
  UPLOAD_DATA: "upload_data",
  VOID_INVOICE: "void_invoice",
  EXPORT_CURRENT_VIEW: "export_current_view",
  EXPORT_AUDIT: "export_audit",
  MANAGE_USERS: "manage_users",
};

const ROLE_PERMISSIONS = {
  [ROLES.ANALYST]: [
    PERMISSIONS.VIEW_DASHBOARD,
    PERMISSIONS.VIEW_INVOICES,
    PERMISSIONS.EDIT_WORKFLOW,
    PERMISSIONS.EXPORT_CURRENT_VIEW,
  ],

  [ROLES.LEAD]: [
    PERMISSIONS.VIEW_DASHBOARD,
    PERMISSIONS.VIEW_INVOICES,
    PERMISSIONS.EDIT_WORKFLOW,
    PERMISSIONS.EDIT_FINANCIAL,
    PERMISSIONS.MANAGE_DISPUTES,
    PERMISSIONS.BULK_ACTIONS,
    PERMISSIONS.EXPORT_CURRENT_VIEW,
    PERMISSIONS.EXPORT_AUDIT,
  ],

  [ROLES.CONTROLLER]: [
    PERMISSIONS.VIEW_DASHBOARD,
    PERMISSIONS.VIEW_INVOICES,
    PERMISSIONS.EXPORT_CURRENT_VIEW,
    PERMISSIONS.EXPORT_AUDIT,
  ],

  [ROLES.ADMIN]: Object.values(PERMISSIONS),
};

export function hasPermission(role, permission) {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function getPermissionsForRole(role) {
  return ROLE_PERMISSIONS[role] ?? [];
}
