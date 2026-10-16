import { hasPermission } from "../permissions.js";

export function requirePermission(permission) {
  return function (req, res, next) {
    if (!req.user) {
      return res.status(401).json({
        error: "UNAUTHORIZED",
        message: "Please authenticate first.",
      });
    }

    if (!hasPermission(req.user.role, permission)) {
      return res.status(403).json({
        error: "FORBIDDEN",
        message: "You do not have permission to perform this action.",
      });
    }

    next();
  };
}
