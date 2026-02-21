import { Router } from 'express';
import { EventHandlers } from '../handlers/event-handlers';

export function createEventRoutes(handlers: EventHandlers): Router {
  const router = Router();

  router.get('/events', (req, res, next) => {
    console.log('get events');
    console.log(res);
    handlers.getEvents(req, res, next);
  });

  return router;
}
