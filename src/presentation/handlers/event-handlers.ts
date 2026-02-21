import { Response, Request, NextFunction } from 'express';
import { GetEventsQueryHandler } from '../../application/queries/get-events-query';

export class EventHandlers {
  constructor(private getEventsQuery: GetEventsQueryHandler) { }

  async getEvents(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
      const events = await this.getEventsQuery.execute(limit);

      res.status(200).json({ code: 200, events });
    } catch (error: any) {
      next(error);
    }
  }
}
