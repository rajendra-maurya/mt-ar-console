import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import db from "../db.js";

import { authenticateToken } from "../middleware/authMiddleware.js";

const router = Router();

router.post("/login", (req, res) => {
  const { email, password } = req.body ?? {};

  if (
    typeof email !== "string" ||
    typeof password !== "string" ||
    !email.trim() ||
    !password
  ) {
    return res.status(400).json({
      error: "INVALID_INPUT",
      message: "Email and password are required.",
    });
  }

  const user = db
    .prepare(
      `
    SELECT id, name, email, password_hash, role, active
    FROM users
    WHERE email = ?
  `,
    )
    .get(email.trim().toLowerCase());

  if (
    !user ||
    user.active !== 1 ||
    !bcrypt.compareSync(password, user.password_hash)
  ) {
    return res.status(401).json({
      error: "INVALID_CREDENTIALS",
      message: "Email or password is incorrect.",
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

  const token = jwt.sign(
    {
      role: user.role,
    },
    secret,
    {
      subject: user.id,
      expiresIn: "2h",
      algorithm: "HS256",
    },
  );

  return res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  });
});

router.get("/me", authenticateToken, (req, res) => {
  return res.json({
    user: {
      id: req.user.id,
      role: req.user.role,
    },
  });
});

export default router;
