import { Request, Response, NextFunction } from "express";

/**
 * Composes middlewares like Express — no array needed.
 *
 * Example:
 * export const handler = withMiddleware(corsMiddleware, authMiddleware, yourHandler);
 */
export function withMiddleware(
  ...handlers: ((req: Request, res: Response, next: NextFunction) => void | Promise<void>)[]
): (req: Request, res: Response) => Promise<void> {
  return async (req: Request, res: Response) => {
    let index = -1;

    const next: NextFunction = async () => {
      index++;
      const handler = handlers[index];
      if (!handler) return; // ✅ done
      await handler(req, res, next);
    };

    await next();
  };
}
