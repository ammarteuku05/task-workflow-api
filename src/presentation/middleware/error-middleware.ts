import { Response, NextFunction } from 'express';
import { RequestWithId } from './request-id-middleware';
import { logger } from '../../infrastructure/logging/logger';

export const errorMiddleware = (err: any, req: RequestWithId, res: Response, next: NextFunction) => {
    const requestId = req.requestId;

    // Log the error with request ID
    logger.error(`Error processing request: ${err.message}`, err, 'errorMiddleware', requestId, {
        path: req.path,
        method: req.method,
        body: req.body,
        params: req.params,
        query: req.query
    });

    if (res.headersSent) {
        return next(err);
    }

    // Determine status code
    let status = 500;
    let message = 'Internal server error';

    if (err.message.includes('required') || err.message.includes('characters') || err.message.includes('must be a number')) {
        status = 400;
        message = err.message;
    } else if (err.message === 'Task not found') {
        status = 404;
        message = err.message;
    } else if (err.message === 'Version conflict' || err.message.includes('Version conflict') || err.message.includes('Invalid transition')) {
        status = 409;
        message = err.message;
    } else if (err.message.includes('Only managers') || err.message.includes('Cannot assign')) {
        status = 403;
        message = err.message;
    }

    res.status(status).json({
        code: status,
        error: message,
        request_id: requestId
    });
};
