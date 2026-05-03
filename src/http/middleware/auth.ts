import type { Request, Response, NextFunction } from 'express';
import { config } from '../../core/config';

export function requireInternalToken(req: Request, res: Response, next: NextFunction): void {
  const token = req.headers['x-internal-token'];
  if (!token || token !== config.notifications.internalToken) {
    res.sendStatus(401);
    return;
  }
  next();
}
