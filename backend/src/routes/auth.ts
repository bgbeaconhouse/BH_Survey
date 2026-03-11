import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db } from "../db/pool.js";

export const authRouter = Router();

authRouter.post("/login", async (req, res) => {
  const { email, password } = req.body as { email: string; password: string };

  if (!email || !password) {
    res.status(400).json({ data: null, error: "Email and password required" });
    return;
  }

  try {
    const result = await db.query(
      "SELECT id, password_hash FROM staff WHERE email = $1",
      [email.toLowerCase()]
    );

    const staff = result.rows[0];

    if (!staff) {
      res.status(401).json({ data: null, error: "Invalid credentials" });
      return;
    }

    const valid = await bcrypt.compare(password, staff.password_hash);

    if (!valid) {
      res.status(401).json({ data: null, error: "Invalid credentials" });
      return;
    }

    const token = jwt.sign(
      { staffId: staff.id },
      process.env.JWT_SECRET!,
      { expiresIn: "8h" }
    );

    res.json({ data: { token }, error: null });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ data: null, error: "Server error" });
  }
});