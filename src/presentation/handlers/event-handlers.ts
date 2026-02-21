import { Response, Request, NextFunction } from 'express';
import { GetEventsQueryHandler } from '../../application/queries/get-events-query';
import { logger } from '../../infrastructure/logging/logger';
import { RequestWithId } from '../middleware/request-id-middleware';

export class EventHandlers {
  constructor(private getEventsQuery: GetEventsQueryHandler) { }

  async getEvents(req: Request, res: Response, next: NextFunction): Promise<void> {
    const requestId = (req as RequestWithId).requestId;
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
      const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;

      logger.info('Fetching events', 'EventHandlers.getEvents', requestId, { limit, offset });

      const result = await this.getEventsQuery.execute(limit, offset);

      res.status(200).json({
        code: 200,
        events: result.events,
        meta: {
          total: result.total,
          limit: result.limit,
          offset: result.offset
        }
      });
    } catch (error: any) {
      logger.error('Failed to get events', error, 'EventHandlers.getEvents', requestId);
      next(error);
    }
  }
}
