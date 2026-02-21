import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

export interface RequestWithId extends Request {
    requestId?: string;
    tenantId?: string;
    userId?: string;
    role?: string;
}

export const requestIdMiddleware = (req: RequestWithId, res: Response, next: NextFunction) => {
    const requestId = uuidv4();
    req.requestId = requestId;
    res.setHeader('X-Request-ID', requestId);
    next();
};
