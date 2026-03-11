import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AuthRequest extends Request {
  staffId?: string;
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;

  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ data: null, error: "Unauthorized" });
    return;
  }

  const token = header.split(" ")[1];

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as { staffId: string };
    req.staffId = payload.staffId;
    next();
  } catch {
    res.status(401).json({ data: null, error: "Invalid or expired token" });
  }
}