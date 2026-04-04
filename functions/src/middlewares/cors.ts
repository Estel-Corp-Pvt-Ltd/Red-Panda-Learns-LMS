import { NextFunction, Request, Response } from "express";

const ALLOWED_ORIGINS = [
  "https://red-panda-learns-lms-dev.web.app",
  "https://red-panda-learns-lms-dev.firebaseapp.com",
  "http://localhost:8080",
];

export const corsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const origin = req.headers.origin || "";
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.set("Access-Control-Allow-Origin", origin);
  }
  res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization, Idempotency-Key");

  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  return next();
};
