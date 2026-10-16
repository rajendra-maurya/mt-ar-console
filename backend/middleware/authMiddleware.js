
import jwt from "jsonwebtoken";
import db from "../db.js";

export function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;

  if (!token) {
    return res.status(401).json({
      error: "UNAUTHORIZED",
      message: "Authentication token is required.",
    });
  }

  const secret = process.env.JWT_SECRET;

  if (!secret) {
    console.error("JWT_SECRET is not configured.");

    return res.status(500).json({
      error: "SERVER_CONFIGURATION_ERROR",
      message: "Authentication is not configured.",
    });
  }

  try {
    const decoded = jwt.verify(token, secret, {
      algorithms: ["HS256"],
    });

    if (!decoded.sub) {
      return res.status(401).json({
        error: "INVALID_TOKEN",
        message: "Authentication token is invalid or expired.",
      });
    }

    // Check the user's current status and role on every request.
    const user = db
      .prepare(
        `SELECT id, role, active
         FROM users
         WHERE id = ?`
      )
      .get(decoded.sub);

    if (!user || user.active !== 1) {
      return res.status(401).json({
        error: "ACCOUNT_INACTIVE",
        message: "This account is inactive or no longer exists.",
      });
    }

    // Use the current database role, not the role stored in the JWT.
    const customerIDs = db
      .prepare(
        `SELECT customer_id
         FROM user_customer_scope
         WHERE user_id = ?`
      )
      .all(user.id)
      .map((row) => row.customer_id);

    req.user = {
      id: user.id,
      role: user.role,
      customerIDs,
    };

    return next();
  } catch {
    return res.status(401).json({
      error: "INVALID_TOKEN",
      message: "Authentication token is invalid or expired.",
    });
  }
}
