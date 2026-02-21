import { Request, Response, NextFunction } from 'express';
import { Role } from '../../domain/types';
import { RequestWithId } from './request-id-middleware';

export interface AuthRequest extends RequestWithId {
  tenantId?: string;
  role?: Role;
  userId?: string;
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction): void {
  const tenantId = req.headers['x-tenant-id'] as string;
  const role = req.headers['x-role'] as string;
  const userId = req.headers['x-user-id'] as string;

  if (!tenantId) {
    const error = 'X-Tenant-Id header is required';
    console.error(`[Error][${req.requestId}] ${error}`);
    res.status(400).json({ code: 400, error, request_id: req.requestId });
    return;
  }

  if (!role || (role !== 'agent' && role !== 'manager')) {
    const error = 'X-Role header must be "agent" or "manager"';
    console.error(`[Error][${req.requestId}] ${error}`);
    res.status(400).json({ code: 400, error, request_id: req.requestId });
    return;
  }

  req.tenantId = tenantId;
  req.role = role as Role;
  req.userId = userId || 'system';

  next();
}
