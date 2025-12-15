import { NextFunction, Request, Response } from "express";

export const corsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS ,PUT ,DELETE");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization, Idempotency-Key");

  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  return next();
};
