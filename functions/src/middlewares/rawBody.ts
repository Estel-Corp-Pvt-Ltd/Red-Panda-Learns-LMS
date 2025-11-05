import { Request, Response, NextFunction } from 'express';
import * as functions from 'firebase-functions';

/**
 * Middleware to capture raw request body
 * This should be used BEFORE any JSON body parsers
 */
export const rawBodyMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Skip for non-POST requests or if raw body already captured
  if (req.method !== 'POST' || (req as any).rawBody) {
    return next();
  }

  const chunks: Buffer[] = [];

  req.on('data', (chunk: Buffer) => {
    chunks.push(chunk);
  });

  req.on('end', () => {
    try {
      const rawBody = Buffer.concat(chunks);
      (req as any).rawBody = rawBody;

      // Also parse JSON for convenience
      if (req.headers['content-type']?.includes('application/json')) {
        try {
          req.body = JSON.parse(rawBody.toString('utf8'));
        } catch (parseError) {
          functions.logger.warn('Could not parse JSON body, using raw body only');
        }
      }

      next();
    } catch (error) {
      functions.logger.error('Error capturing raw body:', error);
      res.status(500).json({ error: 'Failed to process request body' });
    }
  });

  req.on('error', (error) => {
    functions.logger.error('Request stream error:', error);
    res.status(500).json({ error: 'Request processing failed' });
  });
};
