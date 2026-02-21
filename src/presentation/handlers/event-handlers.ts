import { Response, Request, NextFunction } from 'express';
import { GetEventsQueryHandler } from '../../application/queries/get-events-query';

export class EventHandlers {
  constructor(private getEventsQuery: GetEventsQueryHandler) { }

  async getEvents(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
      const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : 0;
      const result = await this.getEventsQuery.execute(limit, offset);

      console.log(res);

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
      next(error);
    }
  }
}
